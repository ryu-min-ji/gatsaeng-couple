"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 지정한 테이블에 변화(내 것이든 파트너 것이든)가 생기면 서버 컴포넌트를
 * 다시 fetch해서 화면을 갱신한다. 화면에 아무것도 렌더링하지 않는다.
 */
export default function RealtimeRefresher({ table }: { table: string }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, table]);

  return null;
}
