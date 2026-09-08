import type { TemplateMeta } from "@/lib/types";

export type SectionId =
  | "hero"
  | "highlights"
  | "services"
  | "about"
  | "gallery"
  | "hours"
  | "contact";

export type HeroStyle = "image" | "split" | "gradient" | "minimal" | "card";
export type CardStyle = "soft" | "bordered" | "flat" | "elevated";
export type FontKey = "sans" | "serif" | "grotesk" | "rounded";

export interface TemplateConfig extends TemplateMeta {
  hero: HeroStyle;
  cards: CardStyle;
  font: FontKey;
  radius: number;
  uppercaseEyebrow: boolean;
  sections: SectionId[];
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "hearth",
    name: "Hearth",
    blurb: "Warm and appetising. Full-bleed hero photo, serif headings. Restaurants, cafes, bakeries.",
    hero: "image",
    cards: "soft",
    font: "serif",
    radius: 18,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "about", "services", "gallery", "hours", "contact"],
    themes: ["ember", "olive", "plum"],
    defaultTheme: "ember",
    accentSwatch: "#C2410C",
  },
  {
    id: "ledger",
    name: "Ledger",
    blurb: "Clean and trustworthy. Services up front, calm palette. Clinics, contractors, trades, offices.",
    hero: "split",
    cards: "bordered",
    font: "sans",
    radius: 12,
    uppercaseEyebrow: true,
    sections: ["hero", "services", "highlights", "about", "hours", "gallery", "contact"],
    themes: ["slate", "teal", "royal"],
    defaultTheme: "slate",
    accentSwatch: "#1E3A8A",
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Modern and friendly. Soft gradient hero, rounded cards. Salons, spas, studios, modern services.",
    hero: "gradient",
    cards: "elevated",
    font: "rounded",
    radius: 24,
    uppercaseEyebrow: false,
    sections: ["hero", "highlights", "services", "gallery", "about", "hours", "contact"],
    themes: ["blossom", "mint", "sky"],
    defaultTheme: "blossom",
    accentSwatch: "#DB2777",
  },
  {
    id: "forge",
    name: "Forge",
    blurb: "Bold and high-energy. Dark sections, big type. Gyms, garages, barbers, anything punchy.",
    hero: "image",
    cards: "flat",
    font: "grotesk",
    radius: 6,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "services", "about", "gallery", "hours", "contact"],
    themes: ["volt", "crimson", "ice"],
    defaultTheme: "volt",
    accentSwatch: "#65A30D",
  },
  {
    id: "atelier",
    name: "Atelier",
    blurb: "Minimal and editorial. Lots of whitespace, restrained type. Boutiques, design-led salons.",
    hero: "minimal",
    cards: "flat",
    font: "serif",
    radius: 4,
    uppercaseEyebrow: true,
    sections: ["hero", "about", "services", "gallery", "highlights", "hours", "contact"],
    themes: ["ink", "sand", "sage"],
    defaultTheme: "sand",
    accentSwatch: "#1C1917",
  },
  {
    id: "card",
    name: "Card",
    blurb: "One screen, no scrolling on desktop. A digital business card. Works for anything.",
    hero: "card",
    cards: "soft",
    font: "sans",
    radius: 22,
    uppercaseEyebrow: false,
    sections: ["hero", "services", "hours", "contact"],
    themes: ["navy", "forest", "grape"],
    defaultTheme: "navy",
    accentSwatch: "#0F172A",
  },
];

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
// Back-compat alias used elsewhere.
export const getTemplateMeta = getTemplate;

// ─── Themes ────────────────────────────────────────────────────────────────────

export interface ThemePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  /** Dark band used by some templates for headers/footers/CTA strips. */
  band: string;
  bandText: string;
}

export const THEMES: Record<string, ThemePalette> = {
  ember: { bg: "#FFFBF7", surface: "#FBEEE3", text: "#2B1810", muted: "#7C5A48", accent: "#C2410C", accentText: "#FFFFFF", border: "#F1DECF", band: "#2B1810", bandText: "#FBEEE3" },
  olive: { bg: "#FBFBF6", surface: "#ECEEDF", text: "#22260F", muted: "#5F6B45", accent: "#4D7C0F", accentText: "#FFFFFF", border: "#DEE2CB", band: "#22260F", bandText: "#ECEEDF" },
  plum: { bg: "#FDFBFD", surface: "#F3E8F1", text: "#2A1424", muted: "#7A5570", accent: "#9D174D", accentText: "#FFFFFF", border: "#EAD7E6", band: "#2A1424", bandText: "#F3E8F1" },
  slate: { bg: "#FBFCFD", surface: "#EEF2F6", text: "#0F172A", muted: "#556378", accent: "#1E3A8A", accentText: "#FFFFFF", border: "#E1E7EE", band: "#0F172A", bandText: "#EEF2F6" },
  teal: { bg: "#F7FCFB", surface: "#DEF1EE", text: "#0C2420", muted: "#436B64", accent: "#0F766E", accentText: "#FFFFFF", border: "#CDE6E1", band: "#0C2420", bandText: "#DEF1EE" },
  royal: { bg: "#FAFBFF", surface: "#E8EDFB", text: "#111633", muted: "#4E567E", accent: "#4338CA", accentText: "#FFFFFF", border: "#DBE1F5", band: "#111633", bandText: "#E8EDFB" },
  blossom: { bg: "#FFFAFC", surface: "#FCE7F0", text: "#2A121F", muted: "#8A5872", accent: "#DB2777", accentText: "#FFFFFF", border: "#F6D6E4", band: "#2A121F", bandText: "#FCE7F0" },
  mint: { bg: "#F6FCF9", surface: "#DDF3E9", text: "#0F2A20", muted: "#42715E", accent: "#059669", accentText: "#FFFFFF", border: "#CBE9DC", band: "#0F2A20", bandText: "#DDF3E9" },
  sky: { bg: "#F7FBFF", surface: "#E1EFFB", text: "#0E2233", muted: "#4A6580", accent: "#0284C7", accentText: "#FFFFFF", border: "#D2E5F4", band: "#0E2233", bandText: "#E1EFFB" },
  volt: { bg: "#0B0D0A", surface: "#161A12", text: "#F2FBE8", muted: "#9DB088", accent: "#84CC16", accentText: "#0B0D0A", border: "#2A331C", band: "#84CC16", bandText: "#0B0D0A" },
  crimson: { bg: "#0C0708", surface: "#1B1012", text: "#FBEAEC", muted: "#B08A8F", accent: "#F43F5E", accentText: "#0C0708", border: "#331B1F", band: "#F43F5E", bandText: "#0C0708" },
  ice: { bg: "#07131A", surface: "#0F2530", text: "#E7F6FC", muted: "#84A6B3", accent: "#22D3EE", accentText: "#07131A", border: "#173743", band: "#22D3EE", bandText: "#07131A" },
  ink: { bg: "#FCFCFC", surface: "#F2F2F1", text: "#0A0A0A", muted: "#6B6B69", accent: "#111111", accentText: "#FFFFFF", border: "#E6E6E4", band: "#111111", bandText: "#F2F2F1" },
  sand: { bg: "#FCFAF6", surface: "#F0EBE1", text: "#26211A", muted: "#726A5C", accent: "#9A7B4F", accentText: "#FFFFFF", border: "#E6DFD1", band: "#26211A", bandText: "#F0EBE1" },
  sage: { bg: "#F9FBF8", surface: "#E7EEE3", text: "#1E2A1C", muted: "#5C6B54", accent: "#5B7553", accentText: "#FFFFFF", border: "#D8E2D2", band: "#1E2A1C", bandText: "#E7EEE3" },
  navy: { bg: "#F7F8FA", surface: "#E9ECF2", text: "#0B1220", muted: "#4C5670", accent: "#1D4ED8", accentText: "#FFFFFF", border: "#DBE0EA", band: "#0B1220", bandText: "#E9ECF2" },
  forest: { bg: "#F6FAF7", surface: "#E2EEE5", text: "#0F241A", muted: "#48705B", accent: "#15803D", accentText: "#FFFFFF", border: "#D1E4D6", band: "#0F241A", bandText: "#E2EEE5" },
  grape: { bg: "#FAF8FD", surface: "#EDE7F7", text: "#1E1233", muted: "#5B4E7E", accent: "#7C3AED", accentText: "#FFFFFF", border: "#DFD6F0", band: "#1E1233", bandText: "#EDE7F7" },
};

export function getThemePalette(theme: string): ThemePalette {
  return THEMES[theme] ?? THEMES.ember;
}

export const FONT_STACKS: Record<FontKey, { heading: string; body: string; import: string }> = {
  sans: {
    heading: "'Inter', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  serif: {
    heading: "'Fraunces', ui-serif, Georgia, serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    import:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap",
  },
  grotesk: {
    heading: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    import:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
  },
  rounded: {
    heading: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    body: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  },
};
