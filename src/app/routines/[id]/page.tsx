import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { calculateRoutineStreak } from "@/lib/streak";
import { cn } from "@/lib/utils";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const { data: me } = await supabase
    .from("profiles")
    .select("id, nickname, partner_id")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase.from("profiles").select("id, nickname").eq("id", me.partner_id).single()
    : { data: null };

  const { data: routine } = await supabase
    .from("routines")
    .select("id, title, success_rule, start_date, penalty_text")
    .eq("id", id)
    .single();

  if (!routine) notFound();

  // 스트릭/성공률 계산에 쓸 전체 기록 + 화면에 보여줄 최근 기록을 한 번에 가져온다
  const { data: allCheckIns } = await supabase
    .from("check_ins")
    .select("id, user_id, date, memo, created_at")
    .eq("routine_id", id)
    .order("created_at", { ascending: false });

  const history = allCheckIns?.slice(0, 10) ?? [];

  const { currentStreak, longestStreak, successDates } = calculateRoutineStreak(
    allCheckIns ?? [],
    routine.success_rule,
    user.id,
    me?.partner_id ?? null,
    today
  );

  const daysElapsed =
    Math.floor(
      (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${routine.start_date}T00:00:00Z`).getTime()) /
        86400000
    ) + 1;

  function successRate(userId: string) {
    const days = new Set(
      (allCheckIns ?? []).filter((c) => c.user_id === userId).map((c) => c.date)
    ).size;
    return daysElapsed > 0 ? Math.round((days / daysElapsed) * 100) : 0;
  }

  const myRate = successRate(user.id);
  const partnerRate = partner ? successRate(partner.id) : null;

  const todayParts = today.split("-");
  const todayYear = Number(todayParts[0]);
  const todayMonth = Number(todayParts[1]);
  const firstOfMonth = new Date(Date.UTC(todayYear, todayMonth - 1, 1));
  const daysInMonth = new Date(Date.UTC(todayYear, todayMonth, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay(); // 0(일) ~ 6(토)

  const calendarCells: { day: number; date: string }[] = Array.from(
    { length: daysInMonth },
    (_, i) => {
      const day = i + 1;
      const date = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, date };
    }
  );

  // 어제 둘 다(파트너가 있다면 파트너도) 인증을 하나도 안 했으면 벌칙 노출.
  // 오늘은 아직 하루가 끝나지 않았으니 "실패"로 판정하지 않는다.
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const yesterdayCheckedInUserIds = new Set(
    (allCheckIns ?? []).filter((c) => c.date === yesterday).map((c) => c.user_id)
  );
  const bothFailedYesterday =
    routine.start_date <= yesterday &&
    !yesterdayCheckedInUserIds.has(user.id) &&
    (!partner || !yesterdayCheckedInUserIds.has(partner.id));

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <h1 className="font-display text-xl font-bold text-plum">{routine.title}</h1>
      <p className="mt-1 text-xs text-ink-muted">
        성공 조건: {routine.success_rule === "both" ? "둘 다 인증해야 성공" : "한 명만 인증해도 성공"}
      </p>

      <section className="mt-4 rounded-card bg-plum p-5 text-white">
        <div className="text-xs text-white/70">연속 성공</div>
        <div className="mt-1 font-display text-4xl font-bold">
          {currentStreak}
          <span className="text-lg font-bold">일</span>
        </div>
        <div className="mt-1 text-xs text-amber">🔥 최장 기록 {longestStreak}일</div>
      </section>

      <section className="mt-4 rounded-card bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
          이 루틴 성공률 비교
        </h2>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-bold">{me?.nickname ?? "나"}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-coral" style={{ width: `${myRate}%` }} />
            </div>
            <span className="w-9 shrink-0 text-right font-bold">{myRate}%</span>
          </div>
          {partner && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-bold">{partner.nickname}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-plum" style={{ width: `${partnerRate}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right font-bold">{partnerRate}%</span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-card bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {todayYear}년 {todayMonth}월
          </h2>
          <span className="text-xs text-ink-muted">성공한 날 ♥</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-muted">
          {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
            <div key={label} className="pb-1">
              {label}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {calendarCells.map(({ day, date }) => {
            const isSuccess = successDates.has(date);
            const isFuture = date > today;
            const isToday = date === today;
            return (
              <div
                key={date}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-xs font-bold",
                  isSuccess && "bg-coral text-white",
                  !isSuccess && !isFuture && "bg-coral-soft/60 text-ink-muted",
                  isFuture && "text-border",
                  isToday && !isSuccess && "border-2 border-coral"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">최근 인증 기록</h2>
        <ul className="flex flex-col gap-2">
          {history.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-sm font-bold">
                {entry.date} · {new Date(entry.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {entry.memo && <div className="mt-1 text-xs text-ink-muted">&ldquo;{entry.memo}&rdquo;</div>}
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 인증 기록이 없어요.
            </li>
          )}
        </ul>
      </section>

      {routine.penalty_text && bothFailedYesterday && (
        <section className="mt-6 rounded-2xl border border-amber bg-amber-soft p-4">
          <div className="text-xs font-bold text-plum">⚠️ 오늘의 벌칙</div>
          <p className="mt-1 text-sm text-plum">{routine.penalty_text}</p>
        </section>
      )}
    </main>
  );
}
