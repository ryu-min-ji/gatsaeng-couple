import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateRoutineStreak } from "@/lib/streak";
import { todayKST } from "@/lib/date";
import RecapCard from "./RecapCard";

export const dynamic = "force-dynamic";

export default async function RecapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const todayStr = todayKST();
  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM
  const year = Number(todayStr.slice(0, 4));
  const month = Number(todayStr.slice(5, 7));

  const { data: me } = await supabase
    .from("profiles")
    .select("nickname, partner_id, connected_at")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("nickname").eq("id", me.partner_id).single()
    : { data: null };

  const connectedDaysAgo = me?.connected_at
    ? Math.floor(
        (new Date(`${todayStr}T00:00:00Z`).getTime() -
          new Date(me.connected_at).setUTCHours(0, 0, 0, 0)) /
          86400000
      ) + 1
    : null;

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

  let longestStreakOverall = 0;
  let monthSuccessDays = 0;
  const monthTargetDaysByRoutine = new Map<string, number>();
  let topRoutineTitle: string | null = null;
  let topRoutineSuccessCount = 0;

  for (const routine of routines ?? []) {
    const checkInsForRoutine = (allCheckIns ?? []).filter((c) => c.routine_id === routine.id);
    const { longestStreak, successDates } = calculateRoutineStreak(
      checkInsForRoutine,
      routine.success_rule,
      user.id,
      me?.partner_id ?? null,
      todayStr,
      routine.frequency,
      routine.frequency_days
    );

    longestStreakOverall = Math.max(longestStreakOverall, longestStreak);

    const monthSuccesses = [...successDates].filter((d) => d.startsWith(monthPrefix));
    monthSuccessDays += monthSuccesses.length;
    monthTargetDaysByRoutine.set(routine.id, monthSuccesses.length);

    if (monthSuccesses.length > topRoutineSuccessCount) {
      topRoutineSuccessCount = monthSuccesses.length;
      topRoutineTitle = routine.title;
    }
  }

  const checkInsThisMonth = (allCheckIns ?? []).filter(
    (c) => c.date.startsWith(monthPrefix) && c.status === "success"
  ).length;

  return (
    <RecapCard
      year={year}
      month={month}
      myNickname={me?.nickname ?? "나"}
      partnerNickname={partner?.nickname ?? null}
      connectedDaysAgo={connectedDaysAgo}
      routineCount={routines?.length ?? 0}
      checkInsThisMonth={checkInsThisMonth}
      longestStreak={longestStreakOverall}
      topRoutineTitle={topRoutineTitle}
      monthSuccessDays={monthSuccessDays}
    />
  );
}
