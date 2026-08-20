import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { calculateRoutineStreak, isTargetDay } from "@/lib/streak";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import CommentThread from "./CommentThread";
import CalendarGrid, { type DayEntry } from "./CalendarGrid";
import DeleteRoutineButton from "./DeleteRoutineButton";
import type { Comment } from "@/lib/types/database";
import { todayKST } from "@/lib/date";

export const dynamic = "force-dynamic";

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

  const today = todayKST();

  const { data: me } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, partner_id")
    .eq("id", user.id)
    .single();

  const { data: partner } = me?.partner_id
    ? await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .eq("id", me.partner_id)
        .single()
    : { data: null };

  const { data: routine } = await supabase
    .from("routines")
    .select("id, title, success_rule, frequency, frequency_days, start_date, penalty_text, created_by")
    .eq("id", id)
    .single();

  if (!routine) notFound();

  // 스트릭/성공률 계산에 쓸 전체 기록 + 화면에 보여줄 최근 기록을 한 번에 가져온다
  const { data: allCheckIns } = await supabase
    .from("check_ins")
    .select("id, user_id, date, status, memo, proof_url, created_at")
    .eq("routine_id", id)
    .order("created_at", { ascending: false });

  const history = allCheckIns?.slice(0, 10) ?? [];
  const historyIds = history.map((entry) => entry.id);

  const { data: comments } =
    historyIds.length > 0
      ? await supabase
          .from("comments")
          .select("id, check_in_id, author_id, body, created_at")
          .in("check_in_id", historyIds)
          .order("created_at", { ascending: true })
      : { data: [] as Comment[] };

  const commentsByCheckIn = new Map<string, Comment[]>();
  for (const comment of comments ?? []) {
    if (!commentsByCheckIn.has(comment.check_in_id)) commentsByCheckIn.set(comment.check_in_id, []);
    commentsByCheckIn.get(comment.check_in_id)!.push(comment);
  }

  // 사진 인증 기록은 proofs가 비공개 버킷이라 서명된 URL을 따로 발급받아야 한다
  const photoUrlByCheckInId = new Map<string, string>();
  await Promise.all(
    history
      .filter((entry) => entry.proof_url)
      .map(async (entry) => {
        const { data } = await supabase.storage
          .from("proofs")
          .createSignedUrl(entry.proof_url!, 3600);
        if (data?.signedUrl) photoUrlByCheckInId.set(entry.id, data.signedUrl);
      })
  );

  const { currentStreak, longestStreak, successDates } = calculateRoutineStreak(
    allCheckIns ?? [],
    routine.success_rule,
    user.id,
    me?.partner_id ?? null,
    today,
    routine.frequency,
    routine.frequency_days
  );

  // 성공률 분모는 지난 달력일수가 아니라 "목표일이었던 날"만 센다
  // (주말만 루틴인데 평일까지 분모에 들어가면 성공률이 부당하게 낮아짐)
  let targetDaysElapsed = 0;
  {
    const d = new Date(`${routine.start_date}T00:00:00Z`);
    const end = new Date(`${today}T00:00:00Z`);
    for (let i = 0; i < 3660 && d.getTime() <= end.getTime(); i++) {
      if (isTargetDay(d.toISOString().slice(0, 10), routine.frequency, routine.frequency_days)) {
        targetDaysElapsed++;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  function successRate(userId: string) {
    const days = new Set(
      (allCheckIns ?? [])
        .filter((c) => c.user_id === userId && c.status === "success")
        .map((c) => c.date)
    ).size;
    return targetDaysElapsed > 0 ? Math.round((days / targetDaysElapsed) * 100) : 0;
  }

  const myRate = successRate(user.id);
  const partnerRate = partner ? successRate(partner.id) : null;

  function nicknameFor(userId: string) {
    if (userId === user!.id) return me?.nickname ?? "나";
    if (userId === partner?.id) return partner.nickname;
    return "상대방";
  }

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

  // 캘린더에서 날짜를 눌렀을 때 보여줄 그날의 인증 기록(이번 달 전체 대상,
  // history는 최근 10건뿐이라 이번 달인데도 빠질 수 있어서 따로 모은다)
  const monthPrefix = `${todayYear}-${String(todayMonth).padStart(2, "0")}`;
  const monthCheckIns = (allCheckIns ?? []).filter((c) => c.date.startsWith(monthPrefix));

  const monthPhotoUrlByCheckInId = new Map(photoUrlByCheckInId);
  await Promise.all(
    monthCheckIns
      .filter((entry) => entry.proof_url && !monthPhotoUrlByCheckInId.has(entry.id))
      .map(async (entry) => {
        const { data } = await supabase.storage
          .from("proofs")
          .createSignedUrl(entry.proof_url!, 3600);
        if (data?.signedUrl) monthPhotoUrlByCheckInId.set(entry.id, data.signedUrl);
      })
  );

  const entriesByDate: Record<string, DayEntry[]> = {};
  for (const entry of [...monthCheckIns].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const dateEntries = entriesByDate[entry.date] ?? (entriesByDate[entry.date] = []);
    dateEntries.push({
      id: entry.id,
      nickname: nicknameFor(entry.user_id),
      time: new Date(entry.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      status: entry.status,
      memo: entry.memo,
      photoUrl: monthPhotoUrlByCheckInId.get(entry.id) ?? null,
    });
  }

  // 어제 둘 다(파트너가 있다면 파트너도) 인증을 하나도 안 했으면 벌칙 노출.
  // 오늘은 아직 하루가 끝나지 않았으니 "실패"로 판정하지 않는다.
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const yesterdayCheckedInUserIds = new Set(
    (allCheckIns ?? [])
      .filter((c) => c.date === yesterday && c.status === "success")
      .map((c) => c.user_id)
  );
  const bothFailedYesterday =
    routine.start_date <= yesterday &&
    isTargetDay(yesterday, routine.frequency, routine.frequency_days) &&
    !yesterdayCheckedInUserIds.has(user.id) &&
    (!partner || !yesterdayCheckedInUserIds.has(partner.id));

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <RealtimeRefresher table="comments" />
      <div className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-plum dark:text-white hover:bg-surface"
        >
          &lt;
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/routines/${routine.id}/edit`} className="text-xs font-bold text-plum dark:text-white">
            수정
          </Link>
          {routine.created_by === user.id && <DeleteRoutineButton routineId={routine.id} />}
        </div>
      </div>
      <h1 className="mt-2 font-display text-xl font-bold text-plum dark:text-white">{routine.title}</h1>
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

      <section className="mt-4 rounded-card bg-surface p-4 shadow-sm">
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

      <section className="mt-4 rounded-card bg-surface p-4 shadow-sm">
        <CalendarGrid
          year={todayYear}
          month={todayMonth}
          today={today}
          leadingBlanks={leadingBlanks}
          calendarCells={calendarCells}
          successDates={[...successDates]}
          entriesByDate={entriesByDate}
          frequency={routine.frequency}
          frequencyDays={routine.frequency_days}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">최근 인증 기록</h2>
        <ul className="flex flex-col gap-2">
          {history.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-surface p-4 shadow-sm">
              <div className="text-sm font-bold">
                {nicknameFor(entry.user_id)} · {new Date(entry.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs text-ink-muted">{entry.date}</div>
              {entry.status === "failed" ? (
                <div className="mt-1 text-xs font-bold text-ink-muted">오늘은 실패했어요</div>
              ) : (
                <>
                  {photoUrlByCheckInId.has(entry.id) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrlByCheckInId.get(entry.id)}
                      alt="인증 사진"
                      className="mt-2 h-40 w-full rounded-xl object-cover"
                    />
                  )}
                  {entry.memo && (
                    <div className="mt-1 text-xs text-ink-muted">&ldquo;{entry.memo}&rdquo;</div>
                  )}
                </>
              )}
              <CommentThread
                checkInId={entry.id}
                userId={user.id}
                meNickname={me?.nickname ?? "나"}
                meAvatarUrl={me?.avatar_url ?? null}
                partnerId={partner?.id ?? null}
                partnerNickname={partner?.nickname ?? null}
                partnerAvatarUrl={partner?.avatar_url ?? null}
                comments={commentsByCheckIn.get(entry.id) ?? []}
              />
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-2xl bg-surface p-4 text-center text-sm text-ink-muted shadow-sm">
              아직 인증 기록이 없어요.
            </li>
          )}
        </ul>
      </section>

      {routine.penalty_text && bothFailedYesterday && (
        <section className="mt-6 rounded-2xl border border-amber bg-amber-soft p-4">
          <div className="text-xs font-bold text-plum dark:text-white">⚠️ 오늘의 벌칙</div>
          <p className="mt-1 text-sm text-plum dark:text-white">{routine.penalty_text}</p>
        </section>
      )}
    </main>
  );
}
