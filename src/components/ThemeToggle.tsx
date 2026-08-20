"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const labels: Record<ThemeChoice, string> = { system: "시스템", light: "라이트", dark: "다크" };
const order: ThemeChoice[] = ["system", "light", "dark"];

function applyTheme(choice: ThemeChoice) {
  const isDark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setChoice(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  function cycle() {
    const next = order[(order.indexOf(choice) + 1) % order.length]!;
    setChoice(next);
    if (next === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", next);
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left text-sm font-bold text-plum dark:text-white shadow-sm transition hover:bg-plum/5"
    >
      테마
      <span className="text-xs font-normal text-ink-muted">{labels[choice]}</span>
    </button>
  );
}
