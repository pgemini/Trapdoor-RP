import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg:     { DEFAULT: "#06070d", elevated: "#0b0d18" },
        panel:  { DEFAULT: "rgba(18, 22, 36, 0.72)", soft: "rgba(28, 32, 50, 0.6)" },
        line:   { DEFAULT: "rgba(255, 255, 255, 0.08)", strong: "rgba(255, 255, 255, 0.14)" },
        muted:  { DEFAULT: "#8a92a8", dim: "#5a6178" },
        accent: { blue: "#00a4ef", blueDark: "#0078d4", purple: "#7c5cff", red: "#f25022" },
        sev:    { danger: "#ff5d6c", warn: "#ffb454", ok: "#43d59d" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 10px 30px rgba(0,164,239,0.25)",
        deep: "0 40px 80px rgba(0,0,0,0.55)",
      },
      backgroundImage: {
        grad: "linear-gradient(135deg, #00a4ef 0%, #7c5cff 50%, #f25022 100%)",
        radial: "radial-gradient(800px 500px at 15% 10%, rgba(0,164,239,0.18), transparent 60%), radial-gradient(700px 500px at 90% 20%, rgba(124,92,255,0.18), transparent 60%), radial-gradient(900px 700px at 50% 110%, rgba(242,80,34,0.10), transparent 60%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-up":    "fade-up 0.4s ease-out forwards",
      },
      keyframes: {
        "pulse-glow": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "fade-up":    { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
