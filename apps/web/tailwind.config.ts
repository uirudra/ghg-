import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#05070d",
        surface: "#0b0f1a",
        raised: "#11172a",
        overlay: "#161d33",
        border: "#1e2740",
        "border-strong": "#2b3658",
        ink: "#e9edf6",
        muted: "#8b93a9",
        faint: "#5b6478",
        co2: {
          DEFAULT: "#3bc7f4",
          dim: "#1c6f8c",
          glow: "#8fe3ff",
        },
        ch4: {
          DEFAULT: "#f5a623",
          dim: "#8a5c17",
          glow: "#ffcf7a",
        },
        good: "#34d399",
        warn: "#f5a623",
        bad: "#f76a6a",
        brand: {
          DEFAULT: "#5b7cfa",
          dim: "#2f3d80",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(91,124,250,0.4), 0 0 40px -8px rgba(91,124,250,0.5)",
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
