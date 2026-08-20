import type { Config } from "tailwindcss";

// 갓생커플 디자인 토큰 — 기획서 6장(UI/UX 디자인 방향)과 동일한 값
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        coral: { DEFAULT: "#FF6B57", soft: "#FFE4DF" },
        plum: { DEFAULT: "#3B2440" },
        amber: { DEFAULT: "#F5A623", soft: "#FEF0D6" },
        bg: { DEFAULT: "#FBF4EF", dark: "#221A22" },
        ink: { DEFAULT: "#2B2130", muted: "#8B7A8F" },
        border: { DEFAULT: "#EFE4E8" },
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
