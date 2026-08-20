"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) return null;

  return (
    <p className="rounded-xl bg-coral-soft px-4 py-2 text-xs text-coral">
      로그인에 실패했어요: {error}
    </p>
  );
}

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile/setup` },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-plum dark:text-white">갓생커플</h1>
        <p className="mt-2 text-sm text-ink-muted">로그인하고 파트너와 연결해보세요</p>
      </div>

      <Suspense fallback={null}>
        <LoginError />
      </Suspense>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-bg"
      >
        Google로 계속하기
      </button>

      {/* TODO: 이메일 로그인이 필요하면 supabase.auth.signInWithOtp 또는
          signInWithPassword로 대체 폼 추가 */}
    </main>
  );
}
