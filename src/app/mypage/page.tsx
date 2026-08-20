import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateRoutineStreak } from "@/lib/streak";
import LogoutButton from "./LogoutButton";
import BottomNav from "@/components/BottomNav";

export default async function MyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const thisMonthPrefix = today.slice(0, 7); // YYYY-MM

  const { data: me } = await supabase
    .from("profiles")
    .select("nickname, partner_id, connected_at")
    .eq("id", user.id)
    .single();

  const connectedDaysAgo = me?.connected_at
    ? Math.floor(
        (new Date(`${today}T00:00:00Z`).getTime() - new Date(me.connected_at).setUTCHours(0, 0, 0, 0)) /
          86400000
      ) + 1
    : null;

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("nickname").eq("id", me.partner_id).single()
    : { data: null };

  const { data: routines } = await supabase
    .from("routines")
    .select("id, title, success_rule, start_date")
    .order("created_at", { ascending: true });

  const routineIds = routines?.map((r) => r.id) ?? [];

  const { data: allCheckIns } =
    routineIds.length > 0
      ? await supabase
          .from("check_ins")
          .select("routine_id, user_id, date")
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
      today
    );

    currentStreakByRoutine.set(routine.id, currentStreak);
    longestStreakOverall = Math.max(longestStreakOverall, longestStreak);
    successDaysTotal += successDates.size;
    elapsedDaysTotal +=
      Math.floor(
        (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${routine.start_date}T00:00:00Z`).getTime()) /
          86400000
      ) + 1;
  }

  const overallSuccessRate =
    elapsedDaysTotal > 0 ? Math.round((successDaysTotal / elapsedDaysTotal) * 100) : 0;

  const checkInsThisMonth = (allCheckIns ?? []).filter(
    (c) => c.user_id === user.id && c.date.startsWith(thisMonthPrefix)
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
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-bg bg-coral font-bold text-white">
            {me?.nickname?.[0] ?? "?"}
          </div>
          <div className="-ml-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-bg bg-plum font-bold text-white">
            {partner?.nickname?.[0] ?? "?"}
          </div>
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-plum">
            {me?.nickname} {partner ? `& ${partner.nickname}` : ""}
          </h1>
          {connectedDaysAgo !== null && (
            <p className="text-xs text-ink-muted">연결한 지 {connectedDaysAgo}일째</p>
          )}
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="font-display text-2xl font-bold text-plum">{stat.value}</div>
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
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:bg-coral/5"
              >
                <span className="text-sm font-bold">{routine.title}</span>
                <span className="text-xs text-ink-muted">
                  {currentStreakByRoutine.get(routine.id) ?? 0}일 연속
                </span>
              </Link>
            </li>
          ))}
          {(!routines || routines.length === 0) && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 만든 루틴이 없어요.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">설정</h2>
        <LogoutButton />
      </section>
      <BottomNav />
    </main>
  );
}
