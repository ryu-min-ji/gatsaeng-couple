"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { dateKeyKST, formatDateDividerKST } from "@/lib/date";
import type { AttachmentType } from "@/lib/types/database";

type CommentRecord = {
  id: string;
  author_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  created_at: string;
};

type PendingFile = {
  kind: AttachmentType;
  blob: Blob;
  previewUrl: string;
};

type Props = {
  checkInId: string;
  userId: string;
  meNickname: string;
  meAvatarUrl: string | null;
  partnerId: string | null;
  partnerNickname: string | null;
  partnerAvatarUrl: string | null;
  comments: CommentRecord[];
};

export default function CommentThread({
  checkInId,
  userId,
  meNickname,
  meAvatarUrl,
  partnerId,
  partnerNickname,
  partnerAvatarUrl,
  comments,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<{ recorder: MediaRecorder; stream: MediaStream } | null>(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const micSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  useEffect(() => {
    return () => {
      if (pendingFile) URL.revokeObjectURL(pendingFile.previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nicknameFor(authorId: string) {
    if (authorId === userId) return meNickname;
    if (authorId === partnerId) return partnerNickname ?? "상대방";
    return "상대방";
  }

  function avatarFor(authorId: string) {
    if (authorId === userId) return meAvatarUrl;
    if (authorId === partnerId) return partnerAvatarUrl;
    return null;
  }

  function clearPendingFile() {
    setPendingFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    clearPendingFile();
    setPendingFile({ kind: "image", blob: file, previewUrl: URL.createObjectURL(file) });
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.recorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        setRecordSeconds(0);
        recorderRef.current = null;
        if (cancelledRef.current) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        clearPendingFile();
        setPendingFile({ kind: "audio", blob, previewUrl: URL.createObjectURL(blob) });
      };

      recorderRef.current = { recorder, stream };
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setError("마이크 권한이 필요해요");
    }
  }

  function cancelRecording() {
    cancelledRef.current = true;
    recorderRef.current?.recorder.stop();
  }

  async function handleSubmit() {
    if (text.trim().length === 0 && !pendingFile) return;
    setSubmitting(true);
    setError(null);

    let attachmentPath: string | null = null;
    let attachmentType: AttachmentType | null = null;

    if (pendingFile) {
      const ext =
        pendingFile.kind === "image" ? pendingFile.blob.type.split("/")[1] || "jpg" : "webm";
      const path = `${userId}/comments/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(path, pendingFile.blob, { contentType: pendingFile.blob.type });

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }
      attachmentPath = path;
      attachmentType = pendingFile.kind;
    }

    const { error: insertError } = await supabase.from("comments").insert({
      check_in_id: checkInId,
      author_id: userId,
      body: text.trim() || null,
      attachment_url: attachmentPath,
      attachment_type: attachmentType,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setText("");
    clearPendingFile();
    router.refresh();
  }

  function startEdit(comment: CommentRecord) {
    setEditingId(comment.id);
    setEditText(comment.body ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(commentId: string) {
    if (editText.trim().length === 0) return;
    setBusyId(commentId);
    setError(null);

    const { error: updateError } = await supabase
      .from("comments")
      .update({ body: editText.trim() })
      .eq("id", commentId);

    setBusyId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    setBusyId(commentId);
    setError(null);

    const { error: deleteError } = await supabase.from("comments").delete().eq("id", commentId);

    setBusyId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {comments.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {comments.map((comment, index) => {
            const isMine = comment.author_id === userId;
            const isEditing = editingId === comment.id;
            const time = new Date(comment.created_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Seoul",
            });
            const dateKey = dateKeyKST(comment.created_at);
            const prevComment = index > 0 ? comments[index - 1] : undefined;
            const prevDateKey = prevComment ? dateKeyKST(prevComment.created_at) : null;
            const showDateDivider = dateKey !== prevDateKey;

            return (
              <li key={comment.id} className="flex flex-col gap-3">
                {showDateDivider && (
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-bg px-3 py-1 text-[10px] font-bold text-ink-muted">
                      {formatDateDividerKST(comment.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}>
                  <Avatar
                    avatarUrl={avatarFor(comment.author_id)}
                    nickname={nicknameFor(comment.author_id)}
                    bg={isMine ? "coral" : "plum"}
                    className="h-6 w-6 shrink-0 text-[10px]"
                  />

                  <div className={cn("flex max-w-[75%] flex-col gap-0.5", isMine && "items-end")}>
                    <span className="px-1 text-[11px] font-bold text-ink-muted">
                      {nicknameFor(comment.author_id)}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(comment.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded-full border border-coral px-3 py-1.5 text-xs outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(comment.id)}
                          disabled={busyId === comment.id || editText.trim().length === 0}
                          className="text-xs font-bold text-coral disabled:opacity-40"
                        >
                          저장
                        </button>
                        <button type="button" onClick={cancelEdit} className="text-xs text-ink-muted">
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className={cn("flex flex-col gap-1", isMine && "items-end")}>
                        {comment.attachment_type === "image" && comment.attachment_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comment.attachment_url}
                            alt="댓글 첨부 사진"
                            className="max-h-48 rounded-2xl object-cover"
                          />
                        )}
                        {comment.attachment_type === "audio" && comment.attachment_url && (
                          <audio controls src={comment.attachment_url} className="h-9 max-w-[220px]" />
                        )}
                        {comment.body && (
                          <div className={cn("flex items-center gap-1", isMine && "flex-row-reverse")}>
                            <div
                              className={cn(
                                "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                                isMine
                                  ? "rounded-tr-sm bg-coral text-white"
                                  : "rounded-tl-sm bg-bg text-ink"
                              )}
                            >
                              {comment.body}
                            </div>
                            <span className="shrink-0 text-[10px] text-ink-muted">{time}</span>
                          </div>
                        )}
                        {!comment.body && (
                          <span className="px-1 text-[10px] text-ink-muted">{time}</span>
                        )}
                      </div>
                    )}

                    {isMine && !isEditing && (
                      <div className="flex gap-2 px-1">
                        {comment.body && (
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            disabled={busyId === comment.id}
                            aria-label="댓글 수정"
                            className="text-ink-muted transition hover:text-coral disabled:opacity-40"
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.6}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M13.5 3.5 16.5 6.5 7 16H4v-3L13.5 3.5Z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          disabled={busyId === comment.id}
                          aria-label="댓글 삭제"
                          className="text-ink-muted transition hover:text-coral disabled:opacity-40"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M4.5 5.5h11M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5 6.7 16a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-10.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-bg p-2">
          {pendingFile.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pendingFile.previewUrl} alt="첨부 미리보기" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <audio controls src={pendingFile.previewUrl} className="h-9 flex-1" />
          )}
          <button
            type="button"
            onClick={clearPendingFile}
            aria-label="첨부 취소"
            className="ml-auto text-ink-muted hover:text-coral"
          >
            ✕
          </button>
        </div>
      )}

      {recording && (
        <div className="mb-2 flex items-center gap-2 rounded-full bg-coral-soft px-3 py-2 text-xs font-bold text-coral">
          <span className="h-2 w-2 animate-pulse rounded-full bg-coral" />
          녹음 중... {String(Math.floor(recordSeconds / 60)).padStart(1, "0")}:
          {String(recordSeconds % 60).padStart(2, "0")}
          <button type="button" onClick={cancelRecording} className="ml-auto text-ink-muted">
            취소
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={recording}
          aria-label="사진 첨부"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-bg hover:text-coral disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect x="2.5" y="5" width="15" height="11" rx="2" />
            <circle cx="10" cy="10.5" r="2.5" />
            <path d="M7 5 8 3h4l1 2" />
          </svg>
        </button>
        {micSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={recording ? "녹음 중지" : "음성 첨부"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
              recording ? "bg-coral text-white" : "text-ink-muted hover:bg-bg hover:text-coral"
            )}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="7" y="2.5" width="6" height="10" rx="3" />
              <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" />
            </svg>
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="응원 한마디 남기기"
          className="flex-1 rounded-full border border-border px-4 py-2 text-xs outline-none focus:border-coral"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (text.trim().length === 0 && !pendingFile)}
          aria-label="댓글 보내기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M2.5 10 17 3l-4.5 15-4-6-6-2Z" />
          </svg>
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  );
}
