"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteRoutineButton({ routineId }: { routineId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("이 루틴을 삭제할까요? 지금까지의 인증 기록도 함께 사라져요.")) return;

    setDeleting(true);
    const { error } = await supabase.from("routines").delete().eq("id", routineId);
    setDeleting(false);

    if (error) {
      window.alert(error.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs font-bold text-coral disabled:opacity-40"
    >
      {deleting ? "삭제하는 중..." : "삭제"}
    </button>
  );
}
