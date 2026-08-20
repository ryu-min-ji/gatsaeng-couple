"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConnectPage() {
  const supabase = createClient();
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("invite_code")
        .eq("id", user.id)
        .single();

      setInviteCode(data?.invite_code ?? null);
    }
    loadProfile();
  }, [supabase]);

  async function handleConnect() {
    setError(null);
    setLoading(true);

    const { error: rpcError } = await supabase.rpc("connect_partner", {
      target_code: partnerCode.trim(),
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pb-10 pt-16 text-center">
      <h1 className="font-display text-2xl font-bold leading-snug text-plum">
        혼자 하지 말고,
        <br />
        같이 갓생 살자
      </h1>
      <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-ink-muted">
        파트너를 초대하고 오늘부터 같이 루틴을 인증해보세요
      </p>

      <section className="mt-8 w-full rounded-card bg-white p-6 shadow-sm">
        <div className="text-left text-xs font-bold tracking-wide text-ink-muted">내 초대코드</div>
        <div className="mt-2 font-display text-2xl font-bold tracking-wide text-coral">
          {inviteCode ?? "불러오는 중..."}
        </div>
      </section>

      <div className="my-6 flex w-full items-center gap-3 text-xs text-ink-muted">
        <div className="h-px flex-1 bg-border" />
        또는
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="w-full text-left">
        <label className="text-xs font-bold tracking-wide text-ink-muted" htmlFor="partner-code">
          파트너 코드로 연결하기
        </label>
        <input
          id="partner-code"
          value={partnerCode}
          onChange={(e) => setPartnerCode(e.target.value)}
          placeholder="코드를 입력해주세요"
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
        />
        {error && <p className="mt-2 text-xs text-coral">{error}</p>}
        <button
          onClick={handleConnect}
          disabled={loading || partnerCode.trim().length === 0}
          className="mt-3 w-full rounded-xl border border-plum py-3 text-sm font-bold text-plum transition hover:bg-plum hover:text-white disabled:opacity-40"
        >
          {loading ? "연결하는 중..." : "연결하기"}
        </button>
      </div>
    </main>
  );
}
