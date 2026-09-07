import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  real,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import type {
  PlacePhoto,
  ScoreFactor,
  ScoringWeights,
  SiteContent,
  SitePhoto,
  OpeningHours,
} from "../types";
import { DEFAULT_SCORING_WEIGHTS, DEFAULT_PRIORITY_CATEGORIES } from "../types";

export const leadStatusEnum = pgEnum("lead_status", [
  "not_contacted",
  "quoted",
  "won",
  "lost",
]);
export const siteStatusEnum = pgEnum("site_status", ["draft", "sent", "live"]);
export const websiteStatusEnum = pgEnum("website_status", [
  "none",
  "social",
  "real",
  "unknown",
]);

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: text("place_id").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    categoryLabel: text("category_label"),
    types: jsonb("types").$type<string[]>().notNull().default([]),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    websiteRaw: text("website_raw"),
    websiteStatus: websiteStatusEnum("website_status").notNull().default("unknown"),
    rating: real("rating"),
    reviewCount: integer("review_count").notNull().default(0),
    photoCount: integer("photo_count").notNull().default(0),
    businessStatus: text("business_status"),
    hoursJson: jsonb("hours_json").$type<OpeningHours | null>(),
    photosJson: jsonb("photos_json").$type<PlacePhoto[]>().notNull().default([]),
    score: integer("score").notNull().default(0),
    scoreBreakdown: jsonb("score_breakdown").$type<ScoreFactor[]>().notNull().default([]),
    rawJson: jsonb("raw_json"),
    firstScannedAt: timestamp("first_scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("businesses_score_idx").on(t.score),
    index("businesses_category_idx").on(t.category),
    index("businesses_geo_idx").on(t.lat, t.lng),
  ],
);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  status: leadStatusEnum("status").notNull().default("not_contacted"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  template: text("template").notNull(),
  theme: text("theme").notNull().default("warm"),
  contentJson: jsonb("content_json").$type<SiteContent>().notNull(),
  photosJson: jsonb("photos_json").$type<SitePhoto[]>().notNull().default([]),
  quotePrice: integer("quote_price").notNull().default(2500),
  status: siteStatusEnum("status").notNull().default("draft"),
  publishedUrl: text("published_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusM: integer("radius_m").notNull(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  apiCalls: integer("api_calls").notNull().default(0),
  resultCount: integer("result_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  mock: boolean("mock").notNull().default(true),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  placesApiKeyEnc: text("places_api_key_enc"),
  llmProvider: text("llm_provider").notNull().default("gemini"),
  llmApiKeyEnc: text("llm_api_key_enc"),
  mapboxToken: text("mapbox_token"),
  priorityCategories: jsonb("priority_categories")
    .$type<string[]>()
    .notNull()
    .default(DEFAULT_PRIORITY_CATEGORIES),
  scoringWeights: jsonb("scoring_weights")
    .$type<ScoringWeights>()
    .notNull()
    .default(DEFAULT_SCORING_WEIGHTS),
  defaultQuoteMin: integer("default_quote_min").notNull().default(2000),
  defaultQuoteMax: integer("default_quote_max").notNull().default(3000),
  pinHash: text("pin_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BusinessRecord = typeof businesses.$inferSelect;
export type LeadRecord = typeof leads.$inferSelect;
export type SiteRecord = typeof sites.$inferSelect;
export type ScanRecord = typeof scans.$inferSelect;
export type SettingsRecord = typeof settings.$inferSelect;
