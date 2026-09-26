import type { TemplateMeta } from "@/lib/types";
import type { MotionPreset } from "@/lib/motion";

export type SectionId =
  | "hero"
  | "highlights"
  | "services"
  | "about"
  | "gallery"
  | "hours"
  | "contact";

export type HeroStyle = "image" | "split" | "gradient" | "minimal" | "card" | "mesh" | "stage";
export type CardStyle = "soft" | "bordered" | "flat" | "elevated" | "glass";
export type FontKey = "sans" | "serif" | "grotesk" | "rounded" | "display";
export type ServicesLayout = "cards" | "list" | "numbered" | "split";
export type GalleryLayout = "grid" | "mosaic" | "marquee" | "stack";
export type HighlightsLayout = "bar" | "cards" | "inline";
export type NavStyle = "solid" | "float" | "minimal";

export interface TemplateConfig extends TemplateMeta {
  hero: HeroStyle;
  cards: CardStyle;
  font: FontKey;
  radius: number;
  uppercaseEyebrow: boolean;
  sections: SectionId[];
  services: ServicesLayout;
  gallery: GalleryLayout;
  highlights: HighlightsLayout;
  nav: NavStyle;
  /** Motion preset applied when a site is first created from this template. */
  motion: MotionPreset;
  /** Centre the hero copy instead of aligning it left. */
  centered: boolean;
  /** One-line hint fed to the copywriter so the words match the look. */
  voice: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "hearth",
    name: "Hearth",
    blurb:
      "Warm and appetising. Full-bleed hero photo with a slow zoom, serif headings. Restaurants, cafes, bakeries.",
    hero: "image",
    cards: "soft",
    font: "serif",
    radius: 18,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "about", "services", "gallery", "hours", "contact"],
    services: "cards",
    gallery: "mosaic",
    highlights: "bar",
    nav: "solid",
    motion: "cinematic",
    centered: false,
    voice: "generous, appetising, family-run warmth",
    themes: ["ember", "olive", "plum"],
    defaultTheme: "ember",
    accentSwatch: "#C2410C",
  },
  {
    id: "ledger",
    name: "Ledger",
    blurb:
      "Clean and trustworthy. Numbered services up front, calm palette, tidy reveals. Clinics, trades, offices.",
    hero: "split",
    cards: "bordered",
    font: "sans",
    radius: 12,
    uppercaseEyebrow: true,
    sections: ["hero", "services", "highlights", "about", "hours", "gallery", "contact"],
    services: "numbered",
    gallery: "grid",
    highlights: "bar",
    nav: "solid",
    motion: "subtle",
    centered: false,
    voice: "precise and reassuring, no hype, competence you can book",
    themes: ["slate", "teal", "royal"],
    defaultTheme: "slate",
    accentSwatch: "#1E3A8A",
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb:
      "Modern and friendly. Drifting gradient wash, rounded cards, stats that count up. Salons, spas, studios.",
    hero: "gradient",
    cards: "elevated",
    font: "rounded",
    radius: 24,
    uppercaseEyebrow: false,
    sections: ["hero", "highlights", "services", "gallery", "about", "hours", "contact"],
    services: "cards",
    gallery: "grid",
    highlights: "cards",
    nav: "float",
    motion: "lively",
    centered: true,
    voice: "friendly, calm, a little indulgent",
    themes: ["blossom", "mint", "sky"],
    defaultTheme: "blossom",
    accentSwatch: "#DB2777",
  },
  {
    id: "forge",
    name: "Forge",
    blurb:
      "Bold and high-energy. Dark sections, huge type, a photo marquee that never stops. Gyms, garages, barbers.",
    hero: "image",
    cards: "flat",
    font: "grotesk",
    radius: 6,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "services", "about", "gallery", "hours", "contact"],
    services: "list",
    gallery: "marquee",
    highlights: "inline",
    nav: "solid",
    motion: "lively",
    centered: false,
    voice: "direct and punchy, second person, short sentences",
    themes: ["volt", "crimson", "ice"],
    defaultTheme: "volt",
    accentSwatch: "#65A30D",
  },
  {
    id: "atelier",
    name: "Atelier",
    blurb:
      "Minimal and editorial. Deep whitespace, restrained type, headlines that wipe in. Boutiques, design-led salons.",
    hero: "minimal",
    cards: "flat",
    font: "serif",
    radius: 4,
    uppercaseEyebrow: true,
    sections: ["hero", "about", "services", "gallery", "highlights", "hours", "contact"],
    services: "split",
    gallery: "stack",
    highlights: "inline",
    nav: "minimal",
    motion: "cinematic",
    centered: false,
    voice: "understated and editorial, every word earns its place",
    themes: ["ink", "sand", "sage"],
    defaultTheme: "sand",
    accentSwatch: "#1C1917",
  },
  {
    id: "pulse",
    name: "Pulse",
    blurb:
      "Motion-first. Living mesh gradient, floating orbs, frosted glass cards. Studios, agencies, anything premium.",
    hero: "mesh",
    cards: "glass",
    font: "display",
    radius: 20,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "services", "gallery", "about", "hours", "contact"],
    services: "cards",
    gallery: "marquee",
    highlights: "cards",
    nav: "float",
    motion: "cinematic",
    centered: true,
    voice: "confident and forward-looking, a touch cinematic",
    themes: ["nebula", "solar", "aqua"],
    defaultTheme: "nebula",
    accentSwatch: "#8B5CF6",
  },
  {
    id: "market",
    name: "Market",
    blurb:
      "Shopfront energy. A mosaic of product shots above the fold, chunky cards. Shops, grocers, boutiques, showrooms.",
    hero: "stage",
    cards: "bordered",
    font: "rounded",
    radius: 16,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "gallery", "services", "about", "hours", "contact"],
    services: "cards",
    gallery: "mosaic",
    highlights: "bar",
    nav: "solid",
    motion: "lively",
    centered: false,
    voice: "cheerful and concrete, talk about the actual goods",
    themes: ["clay", "citrus", "berry"],
    defaultTheme: "clay",
    accentSwatch: "#EA580C",
  },
  {
    id: "night",
    name: "Night",
    blurb:
      "Dark and atmospheric. Low-light photography, glowing accents, slow parallax. Bars, lounges, dinner spots.",
    hero: "image",
    cards: "glass",
    font: "display",
    radius: 10,
    uppercaseEyebrow: true,
    sections: ["hero", "highlights", "about", "services", "gallery", "hours", "contact"],
    services: "list",
    gallery: "mosaic",
    highlights: "inline",
    nav: "float",
    motion: "cinematic",
    centered: true,
    voice: "moody and sensory, evening-out language",
    themes: ["midnight", "noir", "amberlow"],
    defaultTheme: "midnight",
    accentSwatch: "#F59E0B",
  },
  {
    id: "card",
    name: "Card",
    blurb:
      "One screen, no scrolling on desktop. A digital business card that breathes. Works for anything.",
    hero: "card",
    cards: "soft",
    font: "sans",
    radius: 22,
    uppercaseEyebrow: false,
    sections: ["hero", "services", "hours", "contact"],
    services: "list",
    gallery: "grid",
    highlights: "inline",
    nav: "minimal",
    motion: "subtle",
    centered: true,
    voice: "compact, a handshake rather than a brochure",
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
  /** Second hue used by gradient/mesh heroes and ambient orbs. */
  accent2: string;
  /** True when the page background itself is dark. */
  dark: boolean;
}

type ThemeInput = Omit<ThemePalette, "accent2" | "dark"> &
  Partial<Pick<ThemePalette, "accent2" | "dark">>;

function theme(t: ThemeInput): ThemePalette {
  return { accent2: t.accent, dark: false, ...t };
}

export const THEMES: Record<string, ThemePalette> = {
  ember: theme({ bg: "#FFFBF7", surface: "#FBEEE3", text: "#2B1810", muted: "#7C5A48", accent: "#C2410C", accentText: "#FFFFFF", border: "#F1DECF", band: "#2B1810", bandText: "#FBEEE3", accent2: "#EA9A3E" }),
  olive: theme({ bg: "#FBFBF6", surface: "#ECEEDF", text: "#22260F", muted: "#5F6B45", accent: "#4D7C0F", accentText: "#FFFFFF", border: "#DEE2CB", band: "#22260F", bandText: "#ECEEDF", accent2: "#A3B14A" }),
  plum: theme({ bg: "#FDFBFD", surface: "#F3E8F1", text: "#2A1424", muted: "#7A5570", accent: "#9D174D", accentText: "#FFFFFF", border: "#EAD7E6", band: "#2A1424", bandText: "#F3E8F1", accent2: "#D96FA0" }),
  slate: theme({ bg: "#FBFCFD", surface: "#EEF2F6", text: "#0F172A", muted: "#556378", accent: "#1E3A8A", accentText: "#FFFFFF", border: "#E1E7EE", band: "#0F172A", bandText: "#EEF2F6", accent2: "#5B8DEF" }),
  teal: theme({ bg: "#F7FCFB", surface: "#DEF1EE", text: "#0C2420", muted: "#436B64", accent: "#0F766E", accentText: "#FFFFFF", border: "#CDE6E1", band: "#0C2420", bandText: "#DEF1EE", accent2: "#4FC3B0" }),
  royal: theme({ bg: "#FAFBFF", surface: "#E8EDFB", text: "#111633", muted: "#4E567E", accent: "#4338CA", accentText: "#FFFFFF", border: "#DBE1F5", band: "#111633", bandText: "#E8EDFB", accent2: "#8B7BF0" }),
  blossom: theme({ bg: "#FFFAFC", surface: "#FCE7F0", text: "#2A121F", muted: "#8A5872", accent: "#DB2777", accentText: "#FFFFFF", border: "#F6D6E4", band: "#2A121F", bandText: "#FCE7F0", accent2: "#F59EC4" }),
  mint: theme({ bg: "#F6FCF9", surface: "#DDF3E9", text: "#0F2A20", muted: "#42715E", accent: "#059669", accentText: "#FFFFFF", border: "#CBE9DC", band: "#0F2A20", bandText: "#DDF3E9", accent2: "#5FD3A8" }),
  sky: theme({ bg: "#F7FBFF", surface: "#E1EFFB", text: "#0E2233", muted: "#4A6580", accent: "#0284C7", accentText: "#FFFFFF", border: "#D2E5F4", band: "#0E2233", bandText: "#E1EFFB", accent2: "#67C6F5" }),
  volt: theme({ bg: "#0B0D0A", surface: "#161A12", text: "#F2FBE8", muted: "#9DB088", accent: "#84CC16", accentText: "#0B0D0A", border: "#2A331C", band: "#84CC16", bandText: "#0B0D0A", accent2: "#D9F99D", dark: true }),
  crimson: theme({ bg: "#0C0708", surface: "#1B1012", text: "#FBEAEC", muted: "#B08A8F", accent: "#F43F5E", accentText: "#0C0708", border: "#331B1F", band: "#F43F5E", bandText: "#0C0708", accent2: "#FDA4AF", dark: true }),
  ice: theme({ bg: "#07131A", surface: "#0F2530", text: "#E7F6FC", muted: "#84A6B3", accent: "#22D3EE", accentText: "#07131A", border: "#173743", band: "#22D3EE", bandText: "#07131A", accent2: "#A5F3FC", dark: true }),
  ink: theme({ bg: "#FCFCFC", surface: "#F2F2F1", text: "#0A0A0A", muted: "#6B6B69", accent: "#111111", accentText: "#FFFFFF", border: "#E6E6E4", band: "#111111", bandText: "#F2F2F1", accent2: "#8A8A88" }),
  sand: theme({ bg: "#FCFAF6", surface: "#F0EBE1", text: "#26211A", muted: "#726A5C", accent: "#9A7B4F", accentText: "#FFFFFF", border: "#E6DFD1", band: "#26211A", bandText: "#F0EBE1", accent2: "#C9A97C" }),
  sage: theme({ bg: "#F9FBF8", surface: "#E7EEE3", text: "#1E2A1C", muted: "#5C6B54", accent: "#5B7553", accentText: "#FFFFFF", border: "#D8E2D2", band: "#1E2A1C", bandText: "#E7EEE3", accent2: "#9CB68F" }),
  navy: theme({ bg: "#F7F8FA", surface: "#E9ECF2", text: "#0B1220", muted: "#4C5670", accent: "#1D4ED8", accentText: "#FFFFFF", border: "#DBE0EA", band: "#0B1220", bandText: "#E9ECF2", accent2: "#6D9BF5" }),
  forest: theme({ bg: "#F6FAF7", surface: "#E2EEE5", text: "#0F241A", muted: "#48705B", accent: "#15803D", accentText: "#FFFFFF", border: "#D1E4D6", band: "#0F241A", bandText: "#E2EEE5", accent2: "#5FBF83" }),
  grape: theme({ bg: "#FAF8FD", surface: "#EDE7F7", text: "#1E1233", muted: "#5B4E7E", accent: "#7C3AED", accentText: "#FFFFFF", border: "#DFD6F0", band: "#1E1233", bandText: "#EDE7F7", accent2: "#B292F7" }),

  // Pulse
  nebula: theme({ bg: "#08060F", surface: "#120E20", text: "#EDE9FE", muted: "#9C93BE", accent: "#8B5CF6", accentText: "#FFFFFF", border: "#241C3D", band: "#120E20", bandText: "#EDE9FE", accent2: "#22D3EE", dark: true }),
  solar: theme({ bg: "#0B0906", surface: "#191207", text: "#FEF3C7", muted: "#B39A6B", accent: "#F59E0B", accentText: "#1A1206", border: "#33240F", band: "#191207", bandText: "#FEF3C7", accent2: "#F43F5E", dark: true }),
  aqua: theme({ bg: "#04100F", surface: "#0A1F1D", text: "#D8FBF4", muted: "#79A8A0", accent: "#14B8A6", accentText: "#04100F", border: "#123531", band: "#0A1F1D", bandText: "#D8FBF4", accent2: "#38BDF8", dark: true }),

  // Market
  clay: theme({ bg: "#FFFCF8", surface: "#FBEFE2", text: "#301C0D", muted: "#7E6047", accent: "#EA580C", accentText: "#FFFFFF", border: "#F3DFCB", band: "#301C0D", bandText: "#FBEFE2", accent2: "#FBBF24" }),
  citrus: theme({ bg: "#FEFEF6", surface: "#F6F5DA", text: "#28280C", muted: "#6E6D3E", accent: "#CA8A04", accentText: "#FFFFFF", border: "#E9E7C4", band: "#28280C", bandText: "#F6F5DA", accent2: "#84CC16" }),
  berry: theme({ bg: "#FFFAFB", surface: "#FBE6EC", text: "#2C0E17", muted: "#88535F", accent: "#BE123C", accentText: "#FFFFFF", border: "#F3D3DC", band: "#2C0E17", bandText: "#FBE6EC", accent2: "#FB7185" }),

  // Night
  midnight: theme({ bg: "#070A14", surface: "#101728", text: "#E6ECFA", muted: "#8B98B8", accent: "#F59E0B", accentText: "#0B0F1C", border: "#1D2740", band: "#101728", bandText: "#E6ECFA", accent2: "#6366F1", dark: true }),
  noir: theme({ bg: "#0A0A0A", surface: "#151515", text: "#F5F5F4", muted: "#9A9A97", accent: "#E7E5E4", accentText: "#0A0A0A", border: "#262625", band: "#151515", bandText: "#F5F5F4", accent2: "#A8A29E", dark: true }),
  amberlow: theme({ bg: "#100A05", surface: "#1D1309", text: "#FDF0DC", muted: "#B29470", accent: "#D97706", accentText: "#FFFFFF", border: "#33240F", band: "#1D1309", bandText: "#FDF0DC", accent2: "#EF4444", dark: true }),
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
  display: {
    heading: "'Sora', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    import:
      "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap",
  },
};
