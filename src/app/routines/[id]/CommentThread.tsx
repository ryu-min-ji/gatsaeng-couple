"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";

type CommentRecord = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
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

  async function handleSubmit() {
    if (text.trim().length === 0) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("comments").insert({
      check_in_id: checkInId,
      author_id: userId,
      body: text.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setText("");
    router.refresh();
  }

  function startEdit(comment: CommentRecord) {
    setEditingId(comment.id);
    setEditText(comment.body);
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
          {comments.map((comment) => {
            const isMine = comment.author_id === userId;
            const isEditing = editingId === comment.id;
            const time = new Date(comment.created_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <li
                key={comment.id}
                className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}
              >
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

                  {isMine && !isEditing && (
                    <div className="flex gap-2 px-1">
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
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center gap-2">
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
          disabled={submitting || text.trim().length === 0}
          aria-label="댓글 보내기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M2.5 10 17 3l-4.5 15-4-6-6-2Z" />
          </svg>
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  );
}
