"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-2xl bg-surface p-4 text-left text-sm font-bold text-coral shadow-sm transition hover:bg-coral/5 disabled:opacity-40"
    >
      {loading ? "로그아웃하는 중..." : "로그아웃"}
    </button>
  );
}
