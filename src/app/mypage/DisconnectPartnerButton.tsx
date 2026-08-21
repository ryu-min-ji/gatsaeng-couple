"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DisconnectPartnerButton({ partnerNickname }: { partnerNickname: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    if (
      !window.confirm(
        `${partnerNickname}님과 연결을 해제할까요? 공동 루틴과 ${partnerNickname}님의 루틴은 사라지고, 내 개인 루틴과 기록은 그대로 남아요.`
      )
    )
      return;

    setLoading(true);

    const { error } = await supabase.rpc("disconnect_partner");

    setLoading(false);

    if (error) {
      window.alert(error.message);
      return;
    }

    router.push("/connect");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={loading}
      className="w-full rounded-2xl bg-surface p-4 text-left text-sm font-bold text-plum dark:text-white shadow-sm transition hover:bg-plum/5 disabled:opacity-40"
    >
      {loading ? "연결 해제하는 중..." : "파트너 연결 해제"}
    </button>
  );
}
