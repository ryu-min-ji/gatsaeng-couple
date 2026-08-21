"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import RoutineTypeIcon from "@/components/RoutineTypeIcon";
import type { CheckInStatus, VerificationType } from "@/lib/types/database";

type Accent = "amber" | "coral" | "plum";

type Props = {
  routineId: string;
  title: string;
  verificationType: VerificationType;
  userId: string;
  today: string;
  status: CheckInStatus | "pending";
  currentStreak: number;
  accent: Accent;
};

// 공동/개인/상대 루틴을 한눈에 구분할 수 있도록 섹션마다 강조색을 다르게 준다.
const accentClasses: Record<Accent, string> = {
  amber: "border-l-4 border-amber/50 bg-surface",
  coral: "border-l-4 border-coral/50 bg-coral-soft/50 dark:bg-coral/10",
  plum: "border-l-4 border-plum/30 bg-plum/[0.03] dark:border-white/25 dark:bg-white/5",
};

export default function CheckInItem({
  routineId,
  title,
  verificationType,
  userId,
  today,
  status,
  currentStreak,
  accent,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDecided = status !== "pending";

  async function submitCheckIn(fields: {
    memo?: string;
    proof_url?: string;
    status?: CheckInStatus;
  }) {
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("check_ins").insert({
      routine_id: routineId,
      user_id: userId,
      date: today,
      status: fields.status ?? "success",
      ...fields,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setExpanded(false);
    router.refresh();
  }

  async function handlePhotoSelected(file: File) {
    setSubmitting(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${routineId}/${today}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setSubmitting(false);
      setError(uploadError.message);
      return;
    }

    await submitCheckIn({ proof_url: path });
  }

  function handleCircleClick() {
    if (isDecided || submitting) return;

    if (verificationType === "check") {
      submitCheckIn({});
      return;
    }

    if (verificationType === "photo") {
      fileInputRef.current?.click();
      return;
    }

    setExpanded((prev) => !prev);
  }

  function handleMarkFailed() {
    if (isDecided || submitting) return;
    submitCheckIn({ status: "failed" });
  }

  return (
    <li className={cn("rounded-2xl p-4 shadow-sm", accentClasses[accent])}>
      <div className="flex items-center gap-3">
        <Link href={`/routines/${routineId}`} className="flex flex-1 items-center gap-3">
          <RoutineTypeIcon type={verificationType} />
          <div className="flex-1">
            <div className="text-sm font-bold">{title}</div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {status === "failed"
                ? "오늘은 실패했어요"
                : currentStreak > 0
                  ? `${currentStreak}일 연속 성공`
                  : "아직 인증 전이에요"}
            </div>
          </div>
        </Link>

        {verificationType === "photo" && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoSelected(file);
              e.target.value = "";
            }}
          />
        )}

        {!isDecided && (
          <button
            type="button"
            onClick={handleMarkFailed}
            disabled={submitting}
            aria-label="실패로 표시"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-ink-muted transition hover:border-ink-muted hover:text-ink disabled:opacity-40"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <line x1="6" y1="6" x2="14" y2="14" />
              <line x1="14" y1="6" x2="6" y2="14" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={handleCircleClick}
          disabled={isDecided || submitting}
          aria-label={status === "success" ? "인증완료" : status === "failed" ? "실패" : "미인증"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition disabled:cursor-default",
            status === "success" && "bg-coral",
            status === "failed" && "bg-ink-muted",
            status === "pending" && "border-2 border-border hover:border-coral"
          )}
        >
          {status === "success" && (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="5.5,10.5 8.5,13.5 14.5,7.5" />
            </svg>
          )}
          {status === "failed" && (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="6" y1="6" x2="14" y2="14" />
              <line x1="14" y1="6" x2="6" y2="14" />
            </svg>
          )}
        </button>
      </div>

      {expanded && verificationType === "text" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 한 일을 간단히 남겨보세요"
            rows={2}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-coral"
          />
          <button
            type="button"
            onClick={() => submitCheckIn({ memo: memo.trim() || undefined })}
            disabled={submitting || memo.trim().length === 0}
            className="self-end rounded-xl bg-coral px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "인증하는 중..." : "인증하기"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-coral">{error}</p>}
    </li>
  );
}
