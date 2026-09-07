import type { TemplateMeta } from "@/lib/types";

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "warm-hospitality",
    name: "Warm Hospitality",
    blurb: "Cosy, food-forward. Big hero photo, menu-style service list. Great for restaurants & cafes.",
    themes: ["amber", "terracotta", "forest"],
    defaultTheme: "amber",
    accentSwatch: "#F5A623",
  },
  {
    id: "clean-services",
    name: "Clean Services",
    blurb: "Crisp and trustworthy. Service cards up front. Contractors, plumbers, electricians.",
    themes: ["blue", "slate", "green"],
    defaultTheme: "blue",
    accentSwatch: "#2563EB",
  },
  {
    id: "studio-minimal",
    name: "Studio Minimal",
    blurb: "Lots of whitespace, editorial type. Salons, spas, boutiques.",
    themes: ["ink", "blush", "sand"],
    defaultTheme: "blush",
    accentSwatch: "#EC4899",
  },
  {
    id: "bold-fitness",
    name: "Bold Fitness",
    blurb: "High-contrast, punchy. Gyms, trainers, studios.",
    themes: ["lime", "orange", "cyan"],
    defaultTheme: "lime",
    accentSwatch: "#84CC16",
  },
  {
    id: "trusted-clinic",
    name: "Trusted Clinic",
    blurb: "Calm and reassuring. Hours & contact prominent. Dentists, doctors, vets.",
    themes: ["teal", "blue", "green"],
    defaultTheme: "teal",
    accentSwatch: "#0D9488",
  },
  {
    id: "classic-card",
    name: "Classic Card",
    blurb: "Single-column, one-screen business card. Works for anything.",
    themes: ["ink", "amber", "navy"],
    defaultTheme: "navy",
    accentSwatch: "#1E293B",
  },
];

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export interface ThemePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
}

export const THEMES: Record<string, ThemePalette> = {
  amber: { bg: "#FFFBF3", surface: "#FFF3DF", text: "#2A1E0C", muted: "#7A6543", accent: "#F5A623", accentText: "#2A1E0C", border: "#F0DEBE" },
  terracotta: { bg: "#FFF6F2", surface: "#FCE7DE", text: "#3A1E14", muted: "#8A5A48", accent: "#D2683F", accentText: "#FFFFFF", border: "#F3D8CC" },
  forest: { bg: "#F5F8F4", surface: "#E1EDE1", text: "#16241A", muted: "#4E6B54", accent: "#2F7D46", accentText: "#FFFFFF", border: "#D2E3D3" },
  blue: { bg: "#F7F9FF", surface: "#E8F0FE", text: "#101828", muted: "#516079", accent: "#2563EB", accentText: "#FFFFFF", border: "#D6E2F7" },
  slate: { bg: "#F8FAFC", surface: "#EEF2F6", text: "#0F172A", muted: "#55627A", accent: "#475569", accentText: "#FFFFFF", border: "#E2E8F0" },
  green: { bg: "#F5FBF6", surface: "#E4F4E7", text: "#0F2417", muted: "#4C6B55", accent: "#16A34A", accentText: "#FFFFFF", border: "#D3EAD8" },
  ink: { bg: "#FCFCFD", surface: "#F3F4F6", text: "#0A0A0A", muted: "#6B7280", accent: "#111827", accentText: "#FFFFFF", border: "#E5E7EB" },
  blush: { bg: "#FFF8FA", surface: "#FCE7EF", text: "#2A0F1B", muted: "#8A5B6E", accent: "#EC4899", accentText: "#FFFFFF", border: "#F5D6E2" },
  sand: { bg: "#FBF9F4", surface: "#F0EADD", text: "#26210F", muted: "#726A52", accent: "#B08442", accentText: "#FFFFFF", border: "#E6DEC9" },
  lime: { bg: "#0B0F0A", surface: "#17210F", text: "#F3FFE6", muted: "#9CB080", accent: "#84CC16", accentText: "#0B0F0A", border: "#28351A" },
  orange: { bg: "#100A06", surface: "#241408", text: "#FFF1E6", muted: "#B08C72", accent: "#F97316", accentText: "#100A06", border: "#3A2213" },
  cyan: { bg: "#07141A", surface: "#0E2630", text: "#E6FBFF", muted: "#7FA9B4", accent: "#06B6D4", accentText: "#07141A", border: "#153A46" },
  teal: { bg: "#F4FBFA", surface: "#DCF0EC", text: "#0C2420", muted: "#487068", accent: "#0D9488", accentText: "#FFFFFF", border: "#CDE7E1" },
  navy: { bg: "#F7F8FA", surface: "#E9ECF2", text: "#0B1220", muted: "#4E5A70", accent: "#1E293B", accentText: "#FFFFFF", border: "#DCE1EA" },
};

export function getThemePalette(theme: string): ThemePalette {
  return THEMES[theme] ?? THEMES.amber;
}
