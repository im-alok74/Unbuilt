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
        // Accent: green-on-light. Active nav tab, primary buttons, score badges,
        // locate button, top-bar icons.
        accent: {
          DEFAULT: "#12B76A",
          soft: "#3CCB8A",
          deep: "#0E9355",
          wash: "#E7F7EF",
        },
        canvas: "#F3F4F3", // page background behind the frosted chrome
        ink: {
          // Kept for the map's dark building extrusions only.
          950: "#0B0D10",
          900: "#12151A",
        },
        pin: {
          orange: "#F79009", // no website — the opportunity
          pink: "#F6699E", // social page only
          green: "#12B76A", // already has a website
          blue: "#2E90FA", // lead: talking / in progress
          purple: "#8B5CF6", // lead: client
          red: "#F04438", // lead: no-go
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
        chrome: "0 6px 24px rgba(17, 24, 39, 0.12)",
        card: "0 1px 3px rgba(17,24,39,0.08), 0 1px 2px rgba(17,24,39,0.06)",
      },
      keyframes: {
        "pin-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(18,183,106,0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(18,183,106,0)" },
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
