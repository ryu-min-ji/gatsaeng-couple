import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

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

  const { data: routine } = await supabase
    .from("routines")
    .select("id, title, success_rule")
    .eq("id", id)
    .single();

  if (!routine) notFound();

  const { data: history } = await supabase
    .from("check_ins")
    .select("id, user_id, date, memo, created_at")
    .eq("routine_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // TODO: 스트릭 계산 — 연속된 날짜의 check_ins를 both/either 규칙에 맞춰 집계
  // TODO: 캘린더 뷰 — 최근 30~35일치 날짜별 성공 여부를 그리드로 렌더링

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <h1 className="font-display text-xl font-bold text-plum">{routine.title}</h1>
      <p className="mt-1 text-xs text-ink-muted">
        성공 조건: {routine.success_rule === "both" ? "둘 다 인증해야 성공" : "한 명만 인증해도 성공"}
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">최근 인증 기록</h2>
        <ul className="flex flex-col gap-2">
          {history?.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-sm font-bold">
                {entry.date} · {new Date(entry.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {entry.memo && <div className="mt-1 text-xs text-ink-muted">&ldquo;{entry.memo}&rdquo;</div>}
            </li>
          ))}
          {(!history || history.length === 0) && (
            <li className="rounded-2xl bg-white p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 인증 기록이 없어요.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
