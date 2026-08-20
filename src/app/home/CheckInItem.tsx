"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { VerificationType } from "@/lib/types/database";

type Props = {
  routineId: string;
  title: string;
  verificationType: VerificationType;
  userId: string;
  today: string;
  checkedIn: boolean;
  currentStreak: number;
};

export default function CheckInItem({
  routineId,
  title,
  verificationType,
  userId,
  today,
  checkedIn,
  currentStreak,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitCheckIn(fields: { memo?: string; proof_url?: string }) {
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("check_ins").insert({
      routine_id: routineId,
      user_id: userId,
      date: today,
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
    if (checkedIn || submitting) return;

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

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold">{title}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {currentStreak > 0 ? `${currentStreak}일 연속 성공` : "아직 인증 전이에요"}
          </div>
        </div>

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

        <button
          type="button"
          onClick={handleCircleClick}
          disabled={checkedIn || submitting}
          aria-label={checkedIn ? "인증완료" : "미인증"}
          className={cn(
            "h-7 w-7 shrink-0 rounded-full transition disabled:cursor-default",
            checkedIn ? "bg-coral" : "border-2 border-border hover:border-coral"
          )}
        />
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
