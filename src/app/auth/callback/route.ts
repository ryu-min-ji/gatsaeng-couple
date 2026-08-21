import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Google OAuth 로그인 후 Supabase가 리다이렉트하는 콜백.
// PKCE flow의 code를 세션으로 교환해야 실제 로그인이 완료된다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 이미 닉네임/파트너 연결을 마친 사용자라면 매번 온보딩 화면으로
      // 되돌리지 않고 곧장 홈으로 보낸다.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("nickname, partner_id")
            .eq("id", user.id)
            .single()
        : { data: null };

      let next = "/profile/setup";
      if (profile) {
        if (profile.partner_id) {
          next = "/home";
        } else if (profile.nickname && profile.nickname !== "갓생러") {
          next = "/connect";
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
