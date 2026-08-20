"use client";

import { useEffect, useState } from "react";
import {
  isNotificationSupported,
  isNotificationsEnabled,
  setNotificationsEnabled,
} from "@/lib/notifications";

export default function NotificationToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setSupported(isNotificationSupported());
    setEnabled(isNotificationsEnabled());
    if (isNotificationSupported()) setPermission(Notification.permission);
  }, []);

  async function toggle() {
    if (!enabled) {
      const result =
        Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      setPermission(result);
      if (result !== "granted") return;
      setEnabled(true);
      setNotificationsEnabled(true);
    } else {
      setEnabled(false);
      setNotificationsEnabled(false);
    }
  }

  if (!supported) return null;

  const statusLabel = permission === "denied" ? "브라우저에서 차단됨" : enabled ? "켜짐" : "꺼짐";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={permission === "denied"}
      className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left text-sm font-bold text-plum dark:text-white shadow-sm transition hover:bg-plum/5 disabled:opacity-50"
    >
      파트너 인증 알림
      <span className="text-xs font-normal text-ink-muted">{statusLabel}</span>
    </button>
  );
}
