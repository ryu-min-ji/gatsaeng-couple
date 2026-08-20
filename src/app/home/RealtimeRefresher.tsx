"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * check_ins에 변화(내 것이든 파트너 것이든)가 생기면 서버 컴포넌트를
 * 다시 fetch해서 화면을 갱신한다. 화면에 아무것도 렌더링하지 않는다.
 */
export default function RealtimeRefresher() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("check_ins_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}
