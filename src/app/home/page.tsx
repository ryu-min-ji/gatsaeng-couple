import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CheckInItem from "./CheckInItem";
import CheckInNotifier from "./CheckInNotifier";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { calculateRoutineStreak } from "@/lib/streak";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import RoutineTypeIcon from "@/components/RoutineTypeIcon";
import CoupleBadge from "@/components/CoupleBadge";
import { cn } from "@/lib/utils";
import { todayKST } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = todayKST();

  // 내 프로필 + 파트너 프로필
  const { data: me } = await supabase
    .from("profiles")
    .select("id, nickname, partner_id, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .eq("id", me.partner_id)
        .single()
    : { data: null };

  // 오늘의 루틴 (본인이 만든 것 + 파트너가 만든 것, RLS가 커플 범위로 걸러줌)
  const { data: routines } = await supabase
    .from("routines")
    .select("id, title, verification_type, success_rule, assignee_id, frequency, frequency_days")
    .order("created_at", { ascending: true });

  const sharedRoutines = routines?.filter((r) => !r.assignee_id) ?? [];
  const myRoutines = routines?.filter((r) => r.assignee_id === user.id) ?? [];
  const partnerRoutines = routines?.filter((r) => partner && r.assignee_id === partner.id) ?? [];

  const routineIds = routines?.map((r) => r.id) ?? [];

  // 스트릭 계산용 최근 90일 인증 기록 (오늘 인증 여부도 여기서 같이 판단)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const { data: recentCheckIns } =
    routineIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("routine_id, user_id, date, status")
          .in("routine_id", routineIds)
          .gte("date", ninetyDaysAgo.toISOString().slice(0, 10))
      : { data: [] };

  const streaksByRoutine = new Map(
    routines?.map((routine) => [
      routine.id,
      calculateRoutineStreak(
        (recentCheckIns ?? []).filter((c) => c.routine_id === routine.id),
        routine.success_rule,
        user.id,
        me?.partner_id ?? null,
        today,
        routine.frequency,
        routine.frequency_days
      ),
    ])
  );

  const overallStreak = Math.max(
    0,
    ...[...streaksByRoutine.values()].map((s) => s.currentStreak)
  );

  type TodayStatus = "success" | "failed" | "pending";

  const routineStatusToday = (routineId: string, userId: string): TodayStatus => {
    const entry = recentCheckIns?.find(
      (c) => c.routine_id === routineId && c.user_id === userId && c.date === today
    );
    return entry?.status ?? "pending";
  };

  const didCheckInAnyToday = (userId: string) =>
    recentCheckIns?.some(
      (c) => c.user_id === userId && c.date === today && c.status === "success"
    ) ?? false;

  // 이번 주(일요일 시작) 성공률: 그 주에 뭐라도 하나 인증한 날 수 / 지금까지 지난 날 수
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const daysElapsedThisWeek = todayDate.getUTCDay() + 1;

  function weeklySuccessRate(userId: string) {
    let successDays = 0;
    for (let i = 0; i < daysElapsedThisWeek; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      if (
        recentCheckIns?.some(
          (c) => c.user_id === userId && c.date === dateStr && c.status === "success"
        )
      ) {
        successDays++;
      }
    }
    return Math.round((successDays / daysElapsedThisWeek) * 100);
  }

  const myWeeklyRate = weeklySuccessRate(user.id);
  const partnerWeeklyRate = partner ? weeklySuccessRate(partner.id) : null;

  const routineTitleById = Object.fromEntries((routines ?? []).map((r) => [r.id, r.title]));

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <RealtimeRefresher table="check_ins" />
      {partner && (
        <CheckInNotifier
          partnerId={partner.id}
          partnerNickname={partner.nickname}
          routineTitleById={routineTitleById}
        />
      )}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
              timeZone: "Asia/Seoul",
            })}
          </p>
          <h1 className="font-display text-2xl font-bold text-plum dark:text-white">오늘의 갓생</h1>
        </div>
        {overallStreak > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-soft px-3 py-1.5 text-xs font-bold text-plum dark:text-white">
            🔥 {overallStreak}일째
          </span>
        )}
      </header>

      <section className="mt-4 flex rounded-card bg-surface p-4 shadow-sm">
        <div className="flex flex-1 flex-col items-center gap-1">
          <Avatar avatarUrl={me?.avatar_url} nickname={me?.nickname ?? "나"} bg="coral" />
          <div className="text-sm font-bold">{me?.nickname ?? "나"}</div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              didCheckInAnyToday(user.id) ? "bg-coral-soft text-coral" : "bg-border text-ink-muted"
            }`}
          >
            {didCheckInAnyToday(user.id) ? "인증완료" : "대기중"}
          </span>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-1 flex-col items-center gap-1">
          <Avatar avatarUrl={partner?.avatar_url} nickname={partner?.nickname} bg="plum" />
          <div className="text-sm font-bold">{partner?.nickname ?? "파트너 대기중"}</div>
          {partner && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                didCheckInAnyToday(partner.id) ? "bg-coral-soft text-coral" : "bg-border text-ink-muted"
              }`}
            >
              {didCheckInAnyToday(partner.id) ? "인증완료" : "대기중"}
            </span>
          )}
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          오늘의 루틴 · {routines?.length ?? 0}개
        </h2>
        <Link href="/routines/new" className="text-xs font-bold text-coral">
          + 새 루틴
        </Link>
      </div>

      <section className="mt-2">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-muted">
          <span className="h-2 w-2 rounded-full bg-amber" />
          공동 루틴
        </h3>
        <ul className="flex flex-col gap-2">
          {sharedRoutines.map((routine) => (
            <CheckInItem
              key={routine.id}
              routineId={routine.id}
              title={routine.title}
              verificationType={routine.verification_type}
              userId={user.id}
              today={today}
              status={routineStatusToday(routine.id, user.id)}
              currentStreak={streaksByRoutine.get(routine.id)?.currentStreak ?? 0}
              accent="amber"
            />
          ))}
          {sharedRoutines.length === 0 && (
            <li className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
              <CoupleBadge size="md" />
              아직 공동 루틴이 없어요.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-muted">
          <span className="h-2 w-2 rounded-full bg-coral" />
          {me?.nickname ?? "나"}의 할 일
        </h3>
        <ul className="flex flex-col gap-2">
          {myRoutines.map((routine) => (
            <CheckInItem
              key={routine.id}
              routineId={routine.id}
              title={routine.title}
              verificationType={routine.verification_type}
              userId={user.id}
              today={today}
              status={routineStatusToday(routine.id, user.id)}
              currentStreak={streaksByRoutine.get(routine.id)?.currentStreak ?? 0}
              accent="coral"
            />
          ))}
          {myRoutines.length === 0 && (
            <li className="rounded-2xl bg-surface p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 개인 할일이 없어요.
            </li>
          )}
        </ul>
      </section>

      {partner && (
        <section className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-plum dark:bg-white/70" />
            {partner.nickname}의 할 일
          </h3>
          <ul className="flex flex-col gap-2">
            {partnerRoutines.map((routine) => {
              const status = routineStatusToday(routine.id, partner.id);
              return (
                <Link
                  key={routine.id}
                  href={`/routines/${routine.id}`}
                  className="flex items-center gap-3 rounded-2xl border-l-4 border-plum/30 bg-plum/[0.03] p-4 shadow-sm dark:border-white/25 dark:bg-white/5"
                >
                  <RoutineTypeIcon type={routine.verification_type} />
                  <div className="flex-1">
                    <div className="text-sm font-bold">{routine.title}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {status === "failed"
                        ? "오늘은 실패했어요"
                        : streaksByRoutine.get(routine.id)?.currentStreak
                          ? `${streaksByRoutine.get(routine.id)?.currentStreak}일 연속 성공`
                          : "아직 인증 전이에요"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      status === "success" && "bg-coral",
                      status === "failed" && "bg-ink-muted",
                      status === "pending" && "border-2 border-border"
                    )}
                    aria-label={
                      status === "success" ? "인증완료" : status === "failed" ? "실패" : "미인증"
                    }
                  >
                    {status === "success" && (
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <polyline points="5.5,10.5 8.5,13.5 14.5,7.5" />
                      </svg>
                    )}
                    {status === "failed" && (
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <line x1="6" y1="6" x2="14" y2="14" />
                        <line x1="14" y1="6" x2="6" y2="14" />
                      </svg>
                    )}
                  </span>
                </Link>
              );
            })}
            {partnerRoutines.length === 0 && (
              <li className="rounded-2xl bg-surface p-4 text-center text-sm text-ink-muted shadow-sm">
                아직 개인 할일이 없어요.
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-card bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">이번 주 성공률</h2>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-bold">{me?.nickname ?? "나"}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-coral" style={{ width: `${myWeeklyRate}%` }} />
            </div>
            <span className="w-9 shrink-0 text-right font-bold">{myWeeklyRate}%</span>
          </div>
          {partner && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-bold">{partner.nickname}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-plum" style={{ width: `${partnerWeeklyRate}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right font-bold">{partnerWeeklyRate}%</span>
            </div>
          )}
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
