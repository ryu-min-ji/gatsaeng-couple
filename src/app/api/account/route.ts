import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * 회원 탈퇴. auth.users 행을 지우면 profiles.id의 on delete cascade로
 * routines/check_ins/comments가 자동으로 함께 삭제되고, partner_id는
 * on delete set null이라 파트너 쪽 연결도 자동으로 풀린다.
 * auth.users 삭제는 service role 키가 있어야만 가능해서 route handler에서 처리한다.
 */
export async function DELETE() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || serviceRoleKey.startsWith("your")) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요" },
      { status: 500 }
    );
  }

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  // 이 유저가 올린 스토리지 파일 정리 (avatars, proofs 둘 다 {user_id}/... 경로 규칙)
  for (const bucket of ["avatars", "proofs"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files && files.length > 0) {
      await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
    }
    // proofs 버킷은 {user_id}/comments/... 하위 폴더도 쓴다
    const { data: commentFiles } = await admin.storage
      .from(bucket)
      .list(`${user.id}/comments`, { limit: 1000 });
    if (commentFiles && commentFiles.length > 0) {
      await admin.storage
        .from(bucket)
        .remove(commentFiles.map((f) => `${user.id}/comments/${f.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
