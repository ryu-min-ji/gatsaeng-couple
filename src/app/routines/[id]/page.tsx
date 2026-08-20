import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { calculateRoutineStreak } from "@/lib/streak";

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
    .select("id, title, success_rule, start_date")
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

  const { currentStreak, longestStreak } = calculateRoutineStreak(
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

      {/* TODO: 캘린더 뷰 — 최근 30~35일치 날짜별 성공 여부를 그리드로 렌더링 */}
    </main>
  );
}
