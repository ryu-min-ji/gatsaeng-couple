import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CheckInItem from "./CheckInItem";
import RealtimeRefresher from "./RealtimeRefresher";
import { calculateRoutineStreak } from "@/lib/streak";
import BottomNav from "@/components/BottomNav";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  // 내 프로필 + 파트너 프로필
  const { data: me } = await supabase
    .from("profiles")
    .select("id, nickname, partner_id")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("id, nickname").eq("id", me.partner_id).single()
    : { data: null };

  // 오늘의 루틴 (본인이 만든 것 + 파트너가 만든 것, RLS가 커플 범위로 걸러줌)
  const { data: routines } = await supabase
    .from("routines")
    .select("id, title, verification_type, success_rule")
    .order("created_at", { ascending: true });

  const routineIds = routines?.map((r) => r.id) ?? [];

  // 스트릭 계산용 최근 90일 인증 기록 (오늘 인증 여부도 여기서 같이 판단)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const { data: recentCheckIns } =
    routineIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("routine_id, user_id, date")
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
        today
      ),
    ])
  );

  const overallStreak = Math.max(
    0,
    ...[...streaksByRoutine.values()].map((s) => s.currentStreak)
  );

  const didICheckInToday = (routineId: string) =>
    recentCheckIns?.some(
      (c) => c.routine_id === routineId && c.user_id === user.id && c.date === today
    ) ?? false;

  const didCheckInAnyToday = (userId: string) =>
    recentCheckIns?.some((c) => c.user_id === userId && c.date === today) ?? false;

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
      if (recentCheckIns?.some((c) => c.user_id === userId && c.date === dateStr)) {
        successDays++;
      }
    }
    return Math.round((successDays / daysElapsedThisWeek) * 100);
  }

  const myWeeklyRate = weeklySuccessRate(user.id);
  const partnerWeeklyRate = partner ? weeklySuccessRate(partner.id) : null;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <RealtimeRefresher />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
          <h1 className="font-display text-2xl font-bold text-plum">오늘의 갓생</h1>
        </div>
        {overallStreak > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-soft px-3 py-1.5 text-xs font-bold text-plum">
            🔥 {overallStreak}일째
          </span>
        )}
      </header>

      <section className="mt-4 flex rounded-card bg-white p-4 shadow-sm">
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral font-bold text-white">
            {me?.nickname?.[0] ?? "?"}
          </div>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-plum font-bold text-white">
            {partner?.nickname?.[0] ?? "?"}
          </div>
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

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            오늘의 루틴 · {routines?.length ?? 0}개
          </h2>
          <Link href="/routines/new" className="text-xs font-bold text-coral">
            + 새 루틴
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {routines?.map((routine) => (
            <CheckInItem
              key={routine.id}
              routineId={routine.id}
              title={routine.title}
              verificationType={routine.verification_type}
              userId={user.id}
              today={today}
              checkedIn={didICheckInToday(routine.id)}
              currentStreak={streaksByRoutine.get(routine.id)?.currentStreak ?? 0}
            />
          ))}
          {(!routines || routines.length === 0) && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 만든 루틴이 없어요. 첫 루틴을 만들어보세요.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-card bg-white p-4 shadow-sm">
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
