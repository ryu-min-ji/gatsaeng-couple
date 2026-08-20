"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";

type Props = {
  year: number;
  month: number;
  myNickname: string;
  partnerNickname: string | null;
  connectedDaysAgo: number | null;
  routineCount: number;
  checkInsThisMonth: number;
  longestStreak: number;
  topRoutineTitle: string | null;
  monthSuccessDays: number;
};

export default function RecapCard({
  year,
  month,
  myNickname,
  partnerNickname,
  connectedDaysAgo,
  routineCount,
  checkInsThisMonth,
  longestStreak,
  topRoutineTitle,
  monthSuccessDays,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function captureImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, { pixelRatio: 2 });
    } catch {
      setError("이미지를 만드는 데 실패했어요");
      return null;
    }
  }

  async function handleDownload() {
    setBusy(true);
    setError(null);
    const dataUrl = await captureImage();
    setBusy(false);
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `갓생커플-리캡-${year}-${String(month).padStart(2, "0")}.png`;
    link.click();
  }

  async function handleShare() {
    setBusy(true);
    setError(null);
    const dataUrl = await captureImage();

    if (!dataUrl) {
      setBusy(false);
      return;
    }

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `갓생커플-리캡-${year}-${month}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "갓생커플 리캡" });
      } else {
        handleDownload();
      }
    } catch {
      // 사용자가 공유를 취소한 경우 등 — 별도 처리 없이 무시
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 bg-bg px-5 pb-24 pt-8">
      <div className="flex w-full items-center gap-3">
        <Link
          href="/mypage"
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-plum hover:bg-surface dark:text-white"
        >
          &lt;
        </Link>
        <h1 className="font-display text-xl font-bold text-plum dark:text-white">
          {month}월 리캡
        </h1>
      </div>

      <div
        ref={cardRef}
        className="flex w-full flex-col gap-6 rounded-card bg-plum p-7 text-white"
        style={{
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(255,107,87,0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(245,166,35,0.3), transparent 55%)",
        }}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/60">
          <span>갓생커플</span>
          <span>
            {year}년 {month}월
          </span>
        </div>

        <div>
          <div className="text-sm text-white/70">
            {myNickname}
            {partnerNickname ? ` & ${partnerNickname}` : ""}
          </div>
          <div className="mt-1 font-display text-6xl font-bold tabular-nums">
            {monthSuccessDays}
            <span className="text-2xl font-bold">일</span>
          </div>
          <div className="mt-1 text-sm text-white/70">이번 달 함께 갓생을 살았어요</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold tabular-nums">{longestStreak}일</div>
            <div className="mt-0.5 text-xs text-white/70">최장 스트릭</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold tabular-nums">{routineCount}개</div>
            <div className="mt-0.5 text-xs text-white/70">함께한 루틴</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold tabular-nums">{checkInsThisMonth}회</div>
            <div className="mt-0.5 text-xs text-white/70">이번 달 인증</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="font-display text-2xl font-bold tabular-nums">
              {connectedDaysAgo ?? "-"}일
            </div>
            <div className="mt-0.5 text-xs text-white/70">연결한 지</div>
          </div>
        </div>

        {topRoutineTitle && (
          <div className="rounded-2xl border border-white/20 p-3">
            <div className="text-xs text-white/70">이번 달 최애 루틴</div>
            <div className="mt-1 text-sm font-bold">{topRoutineTitle}</div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}

      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className="flex-1 rounded-xl border border-plum py-3 text-sm font-bold text-plum transition hover:bg-plum hover:text-white disabled:opacity-40 dark:border-white dark:text-white"
        >
          {busy ? "만드는 중..." : "다운로드"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={busy}
          className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          공유하기
        </button>
      </div>
    </main>
  );
}
