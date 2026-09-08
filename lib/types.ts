// ─── Shared domain types ───────────────────────────────────────────────────────

export type LeadStatus = "not_contacted" | "quoted" | "won" | "lost";
export type SiteStatus = "draft" | "sent" | "live";
export type WebsiteStatus = "none" | "social" | "real" | "unknown";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  not_contacted: "Not contacted",
  quoted: "Talking",
  won: "Client",
  lost: "No-go",
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  draft: "Draft",
  sent: "Sent to client",
  live: "Live",
};

// ─── Scoring ───────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  noWebsite: number;
  socialOnly: number;
  fewPhotos: number;
  underMarketed: number;
  priorityCategory: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  noWebsite: 50,
  socialOnly: 20,
  fewPhotos: 10,
  underMarketed: 10,
  priorityCategory: 10,
};

export const DEFAULT_PRIORITY_CATEGORIES = [
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "hair_salon",
  "beauty_salon",
  "nail_salon",
  "spa",
  "gym",
  "fitness_center",
  "general_contractor",
  "electrician",
  "plumber",
  "painter",
  "roofing_contractor",
  "doctor",
  "dentist",
  "physiotherapist",
  "veterinary_care",
];

export interface ScoreFactor {
  key: keyof ScoringWeights;
  label: string;
  points: number;
  detail: string;
}

export interface ScoreResult {
  score: number;
  factors: ScoreFactor[];
}

// ─── Places ────────────────────────────────────────────────────────────────────

export interface PlacePhoto {
  name: string; // Places photo resource name, or an absolute URL for uploads/mock
  widthPx?: number;
  heightPx?: number;
  uri?: string; // resolved absolute URL when available
}

export interface NormalizedBusiness {
  placeId: string;
  name: string;
  category: string | null;
  categoryLabel: string | null;
  types: string[];
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  websiteRaw: string | null;
  websiteStatus: WebsiteStatus;
  rating: number | null;
  reviewCount: number;
  photoCount: number;
  photos: PlacePhoto[];
  businessStatus: string | null;
  hours: OpeningHours | null;
  raw: unknown;
}

export interface OpeningHours {
  weekdayDescriptions: string[];
  openNow?: boolean;
}

// ─── Sites ─────────────────────────────────────────────────────────────────────

export interface SiteService {
  title: string;
  body: string;
}

export interface SiteContent {
  businessName: string;
  tagline: string;
  heroHeadline: string;
  heroSub: string;
  ctaLabel: string;
  aboutTitle: string;
  aboutBody: string;
  services: SiteService[];
  hoursTitle: string;
  hours: string[];
  address: string;
  phone: string;
  mapLink: string;
  footerNote: string;
}

export interface SitePhoto {
  url: string;
  alt: string;
  source: "places" | "upload" | "stock";
}

export interface TemplateMeta {
  id: string;
  name: string;
  blurb: string;
  themes: string[];
  defaultTheme: string;
  accentSwatch: string;
}

// ─── API payloads ──────────────────────────────────────────────────────────────

export interface BusinessRow {
  id: string;
  placeId: string;
  name: string;
  category: string | null;
  categoryLabel: string | null;
  types: string[];
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  websiteRaw: string | null;
  websiteStatus: WebsiteStatus;
  hasWebsite: boolean;
  rating: number | null;
  reviewCount: number;
  photoCount: number;
  photos: PlacePhoto[];
  businessStatus: string | null;
  hours: OpeningHours | null;
  score: number;
  scoreBreakdown: ScoreFactor[];
  leadStatus: LeadStatus;
  notes: string;
  siteStatus: SiteStatus | null;
  siteId: string | null;
  siteSlug: string | null;
  quotePrice: number | null;
  lastScannedAt: string;
  stale: boolean;
}

export interface ScanEstimate {
  tiles: number;
  apiCalls: number;
  approxCredits: number;
  heavy: boolean;
  mock: boolean;
}
