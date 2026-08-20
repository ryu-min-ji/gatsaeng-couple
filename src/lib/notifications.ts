const STORAGE_KEY = "notifications-enabled";

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}
