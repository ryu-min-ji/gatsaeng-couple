import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateRoutineStreak } from "@/lib/streak";

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
    .select("nickname, partner_id, created_at")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("nickname").eq("id", me.partner_id).single()
    : { data: null };

  const { data: routines } = await supabase
    .from("routines")
    .select("id, success_rule, start_date");

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

  for (const routine of routines ?? []) {
    const checkInsForRoutine = (allCheckIns ?? []).filter((c) => c.routine_id === routine.id);
    const { longestStreak, successDates } = calculateRoutineStreak(
      checkInsForRoutine,
      routine.success_rule,
      user.id,
      me?.partner_id ?? null,
      today
    );

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
          {/* TODO: 커플 연결일(profiles.created_at 대신 연결 이벤트를 별도 기록하면 더 정확) */}
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
    </main>
  );
}
