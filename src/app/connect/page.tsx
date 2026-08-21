"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CoupleBadge from "@/components/CoupleBadge";

export default function ConnectPage() {
  const supabase = createClient();
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("invite_code, partner_id")
        .eq("id", user.id)
        .single();

      if (data?.partner_id) {
        router.replace("/home");
        return;
      }

      setInviteCode(data?.invite_code ?? null);
    }
    loadProfile();
  }, [supabase, router]);

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyFeedback("복사됐어요");
    } catch {
      setCopyFeedback("복사에 실패했어요");
    }
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  async function handleShare() {
    if (!inviteCode) return;
    const shareText = `갓생커플에서 같이 루틴 인증해요! 초대코드: ${inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "갓생커플 초대", text: shareText });
      } catch {
        // 사용자가 공유를 취소한 경우 등 — 별도 처리 없이 무시
      }
      return;
    }

    await handleCopy();
  }

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
      <CoupleBadge />
      <h1 className="mt-4 font-display text-2xl font-bold leading-snug text-plum dark:text-white">
        혼자 하지 말고,
        <br />
        같이 갓생 살자
      </h1>
      <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-ink-muted">
        파트너를 초대하고 오늘부터 같이 루틴을 인증해보세요
      </p>

      <section className="mt-8 w-full rounded-card bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-left text-xs font-bold tracking-wide text-ink-muted">내 초대코드</div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!inviteCode}
            aria-label="초대코드 복사하기"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-soft text-coral transition hover:opacity-80 disabled:opacity-40"
          >
            ⧉
          </button>
        </div>
        <div className="mt-2 text-left font-display text-2xl font-bold tracking-wide text-coral">
          {inviteCode ?? "불러오는 중..."}
        </div>
        {copyFeedback && <p className="mt-1 text-left text-xs text-ink-muted">{copyFeedback}</p>}
        <button
          type="button"
          onClick={handleShare}
          disabled={!inviteCode}
          className="mt-4 w-full rounded-xl bg-coral py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          코드 공유하기
        </button>
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
          className="mt-3 w-full rounded-xl border border-plum py-3 text-sm font-bold text-plum transition hover:bg-plum hover:text-white disabled:opacity-40 dark:border-white dark:text-white"
        >
          {loading ? "연결하는 중..." : "연결하기"}
        </button>
      </div>

      <Link href="/home" className="mt-6 text-xs font-bold text-ink-muted underline">
        나중에 연결할게요 · 먼저 둘러보기
      </Link>
    </main>
  );
}
