import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accent: amber-on-dark. Used for active nav tab, high-score pins,
        // primary buttons, score badges, top-bar icons.
        accent: {
          DEFAULT: "#F5A623",
          soft: "#FFC65C",
          deep: "#C97F12",
          glow: "rgba(245, 166, 35, 0.35)",
        },
        ink: {
          // Dark base surfaces (map chrome, panels).
          950: "#0B0D10",
          900: "#12151A",
          850: "#181C22",
          800: "#1F242C",
          700: "#2A313B",
          600: "#3A424E",
        },
        pin: {
          green: "#3FB65B", // saved / has-website / low priority
          amber: "#F5A623", // active candidate lead
          pink: "#EC4899", // top-scoring / flagged lead
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        chrome: "0 8px 30px rgba(0, 0, 0, 0.35)",
        pin: "0 0 0 4px rgba(245, 166, 35, 0.25)",
      },
      backdropBlur: {
        chrome: "18px",
      },
      keyframes: {
        "pin-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,166,35,0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(245,166,35,0)" },
        },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "pin-pulse": "pin-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
