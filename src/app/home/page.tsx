import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    .select("id, title")
    .order("created_at", { ascending: true });

  // 오늘 인증 여부 (본인/파트너)
  const { data: todayCheckIns } = await supabase
    .from("check_ins")
    .select("routine_id, user_id")
    .eq("date", today);

  const didICheckInToday = (routineId: string) =>
    todayCheckIns?.some((c) => c.routine_id === routineId && c.user_id === user.id) ?? false;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
          <h1 className="font-display text-2xl font-bold text-plum">오늘의 갓생</h1>
        </div>
        {/* TODO: 전체 스트릭 배지 — check_ins 기반으로 연속 성공일수 계산 필요 */}
      </header>

      <section className="mt-4 flex rounded-card bg-white p-4 shadow-sm">
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral font-bold text-white">
            {me?.nickname?.[0] ?? "?"}
          </div>
          <div className="text-sm font-bold">{me?.nickname ?? "나"}</div>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-plum font-bold text-white">
            {partner?.nickname?.[0] ?? "?"}
          </div>
          <div className="text-sm font-bold">{partner?.nickname ?? "파트너 대기중"}</div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
          오늘의 루틴 · {routines?.length ?? 0}개
        </h2>
        <ul className="flex flex-col gap-2">
          {routines?.map((routine) => (
            <li
              key={routine.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <span className="flex-1 text-sm font-bold">{routine.title}</span>
              <span
                className={`h-7 w-7 rounded-full ${
                  didICheckInToday(routine.id) ? "bg-coral" : "border-2 border-border"
                }`}
                aria-label={didICheckInToday(routine.id) ? "인증완료" : "미인증"}
              />
              {/* TODO: 클릭 시 인증(check_ins insert) 처리 — 사진/텍스트 업로드 모달 */}
            </li>
          ))}
          {(!routines || routines.length === 0) && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 만든 루틴이 없어요. 첫 루틴을 만들어보세요.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
