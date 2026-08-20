"use client";

import { createClient } from "@/lib/supabase/client";

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
        <h1 className="font-display text-2xl font-bold text-plum">갓생커플</h1>
        <p className="mt-2 text-sm text-ink-muted">로그인하고 파트너와 연결해보세요</p>
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-xl border border-border bg-white px-6 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-bg"
      >
        Google로 계속하기
      </button>

      {/* TODO: 이메일 로그인이 필요하면 supabase.auth.signInWithOtp 또는
          signInWithPassword로 대체 폼 추가 */}
    </main>
  );
}
