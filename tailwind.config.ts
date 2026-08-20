import type { Config } from "tailwindcss";

// 갓생커플 디자인 토큰 — 기획서 6장(UI/UX 디자인 방향)과 동일한 값
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        coral: { DEFAULT: "#FF6B57", soft: "#FFE4DF" },
        plum: { DEFAULT: "#3B2440" },
        amber: { DEFAULT: "#F5A623", soft: "#FEF0D6" },
        // bg/surface/ink/border는 CSS 변수 기반 — globals.css의 :root와
        // .dark 블록에서 값을 바꿔주면 클래스명 그대로 다크모드에 반응한다.
        bg: { DEFAULT: "var(--color-bg)" },
        surface: { DEFAULT: "var(--color-surface)" },
        ink: { DEFAULT: "var(--color-ink)", muted: "var(--color-ink-muted)" },
        border: { DEFAULT: "var(--color-border)" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-noto-kr)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
