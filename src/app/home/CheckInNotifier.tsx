"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNotificationSupported, isNotificationsEnabled } from "@/lib/notifications";

type Props = {
  partnerId: string;
  partnerNickname: string;
  routineTitleById: Record<string, string>;
};

export default function CheckInNotifier({ partnerId, partnerNickname, routineTitleById }: Props) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("check_ins_partner_notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "check_ins", filter: `user_id=eq.${partnerId}` },
        (payload) => {
          if (!isNotificationSupported() || !isNotificationsEnabled()) return;
          if (Notification.permission !== "granted") return;
          if (document.hasFocus()) return;

          const row = payload.new as { routine_id: string; status: string };
          if (row.status !== "success") return;

          const title = routineTitleById[row.routine_id] ?? "루틴";
          new Notification(`${partnerNickname}님이 인증했어요!`, { body: title });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, partnerId, partnerNickname, routineTitleById]);

  return null;
}
