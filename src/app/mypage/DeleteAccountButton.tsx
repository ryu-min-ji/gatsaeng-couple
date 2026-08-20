"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountButton() {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("정말 탈퇴할까요? 내 루틴, 인증 기록, 댓글이 전부 사라지고 되돌릴 수 없어요.")) return;
    if (!window.confirm("한 번 더 확인할게요. 정말로 탈퇴하시겠어요?")) return;

    setDeleting(true);

    const res = await fetch("/api/account", { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      window.alert(body?.error ?? "탈퇴에 실패했어요");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="w-full rounded-2xl bg-surface p-4 text-left text-sm font-bold text-coral shadow-sm transition hover:bg-coral/5 disabled:opacity-40"
    >
      {deleting ? "탈퇴하는 중..." : "회원 탈퇴"}
    </button>
  );
}
