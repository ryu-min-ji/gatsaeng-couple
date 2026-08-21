import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateRoutineStreak, isTargetDay } from "@/lib/streak";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import DisconnectPartnerButton from "./DisconnectPartnerButton";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationToggle from "@/components/NotificationToggle";
import CoupleBadge from "@/components/CoupleBadge";
import { todayKST } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = todayKST();
  const thisMonthPrefix = today.slice(0, 7); // YYYY-MM

  const { data: me } = await supabase
    .from("profiles")
    .select("nickname, partner_id, connected_at, avatar_url")
    .eq("id", user.id)
    .single();

  const connectedDaysAgo = me?.connected_at
    ? Math.floor(
        (new Date(`${today}T00:00:00Z`).getTime() - new Date(me.connected_at).setUTCHours(0, 0, 0, 0)) /
          86400000
      ) + 1
    : null;

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("nickname, avatar_url").eq("id", me.partner_id).single()
    : { data: null };

  const { data: routines } = await supabase
    .from("routines")
    .select("id, title, success_rule, frequency, frequency_days, start_date")
    .order("created_at", { ascending: true });

  const routineIds = routines?.map((r) => r.id) ?? [];

  const { data: allCheckIns } =
    routineIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("routine_id, user_id, date, status")
          .in("routine_id", routineIds)
      : { data: [] };

  let successDaysTotal = 0;
  let elapsedDaysTotal = 0;
  let longestStreakOverall = 0;
  const currentStreakByRoutine = new Map<string, number>();

  for (const routine of routines ?? []) {
    const checkInsForRoutine = (allCheckIns ?? []).filter((c) => c.routine_id === routine.id);
    const { currentStreak, longestStreak, successDates } = calculateRoutineStreak(
      checkInsForRoutine,
      routine.success_rule,
      user.id,
      me?.partner_id ?? null,
      today,
      routine.frequency,
      routine.frequency_days
    );

    currentStreakByRoutine.set(routine.id, currentStreak);
    longestStreakOverall = Math.max(longestStreakOverall, longestStreak);
    successDaysTotal += successDates.size;

    // 성공률 분모는 목표일로 잡힌 날만 센다 (daysElapsed 아님)
    const d = new Date(`${routine.start_date}T00:00:00Z`);
    const end = new Date(`${today}T00:00:00Z`);
    for (let i = 0; i < 3660 && d.getTime() <= end.getTime(); i++) {
      if (isTargetDay(d.toISOString().slice(0, 10), routine.frequency, routine.frequency_days)) {
        elapsedDaysTotal++;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  const overallSuccessRate =
    elapsedDaysTotal > 0 ? Math.round((successDaysTotal / elapsedDaysTotal) * 100) : 0;

  const checkInsThisMonth = (allCheckIns ?? []).filter(
    (c) => c.user_id === user.id && c.date.startsWith(thisMonthPrefix) && c.status === "success"
  ).length;

  const stats = [
    { label: "전체 성공률", value: `${overallSuccessRate}%` },
    { label: "최장 스트릭", value: `${longestStreakOverall}일` },
    { label: "함께한 루틴", value: `${routines?.length ?? 0}개` },
    { label: "이번 달 인증", value: `${checkInsThisMonth}회` },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <header className="flex items-center gap-3">
        <div className="flex">
          <Avatar
            avatarUrl={me?.avatar_url}
            nickname={me?.nickname}
            bg="coral"
            className="h-11 w-11 border-2 border-bg"
          />
          <Avatar
            avatarUrl={partner?.avatar_url}
            nickname={partner?.nickname}
            bg="plum"
            className="-ml-3 h-11 w-11 border-2 border-bg"
          />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-plum dark:text-white">
            {me?.nickname} {partner ? `& ${partner.nickname}` : ""}
          </h1>
          {connectedDaysAgo !== null && (
            <p className="text-xs text-ink-muted">연결한 지 {connectedDaysAgo}일째</p>
          )}
        </div>
      </header>

      <Link
        href="/recap"
        className="mt-6 flex items-center justify-between rounded-card bg-plum p-4 text-white shadow-sm transition hover:opacity-90"
      >
        <div>
          <div className="text-sm font-bold">이번 달 리캡 카드 만들기</div>
          <div className="mt-0.5 text-xs text-white/70">우리의 갓생을 카드로 남기고 공유해요</div>
        </div>
        <span aria-hidden>›</span>
      </Link>

      <section className="mt-6 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface p-4 shadow-sm">
            <div className="font-display text-2xl font-bold text-plum dark:text-white">{stat.value}</div>
            <div className="mt-1 text-xs text-ink-muted">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">진행 중인 루틴</h2>
        <ul className="flex flex-col gap-2">
          {routines?.map((routine) => (
            <li key={routine.id}>
              <Link
                href={`/routines/${routine.id}`}
                className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-sm transition hover:bg-coral/5"
              >
                <span className="text-sm font-bold">{routine.title}</span>
                <span className="text-xs text-ink-muted">
                  {currentStreakByRoutine.get(routine.id) ?? 0}일 연속
                </span>
              </Link>
            </li>
          ))}
          {(!routines || routines.length === 0) && (
            <li className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
              <CoupleBadge size="md" />
              아직 만든 루틴이 없어요.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">설정</h2>
        <Link
          href="/profile/setup"
          className="mb-2 block rounded-2xl bg-surface p-4 text-left text-sm font-bold text-plum dark:text-white shadow-sm transition hover:bg-plum/5"
        >
          프로필 수정
        </Link>
        <div className="mb-2">
          <ThemeToggle />
        </div>
        <div className="mb-2">
          <NotificationToggle />
        </div>
        {partner && (
          <div className="mb-2">
            <DisconnectPartnerButton partnerNickname={partner.nickname} />
          </div>
        )}
        <div className="mb-2">
          <LogoutButton />
        </div>
        <DeleteAccountButton />
      </section>
      <BottomNav />
    </main>
  );
}
