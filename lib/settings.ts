import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto";
import {
  DEFAULT_PRIORITY_CATEGORIES,
  DEFAULT_SCORING_WEIGHTS,
  type ScoringWeights,
} from "@/lib/types";
import type { SettingsRecord } from "@/lib/db/schema";

export async function getSettingsRow(): Promise<SettingsRecord> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const inserted = await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const again = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return again[0];
}

export interface EffectiveConfig {
  placesApiKey: string | null;
  llmProvider: string;
  llmApiKey: string | null;
  mapboxToken: string | null;
  priorityCategories: string[];
  scoringWeights: ScoringWeights;
  defaultQuoteMin: number;
  defaultQuoteMax: number;
  pinConfigured: boolean;
  hasPlacesKey: boolean;
  hasLlmKey: boolean;
  hasMapbox: boolean;
}

/** Effective config: env vars win over DB values where both exist. */
export async function getConfig(): Promise<EffectiveConfig> {
  const row = await getSettingsRow();

  const placesApiKey =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    decryptSecret(row.placesApiKeyEnc) ||
    null;

  const llmApiKey =
    process.env.GEMINI_API_KEY?.trim() || decryptSecret(row.llmApiKeyEnc) || null;

  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || row.mapboxToken || null;

  return {
    placesApiKey,
    llmProvider: row.llmProvider || "gemini",
    llmApiKey,
    mapboxToken,
    priorityCategories: row.priorityCategories?.length
      ? row.priorityCategories
      : DEFAULT_PRIORITY_CATEGORIES,
    scoringWeights: { ...DEFAULT_SCORING_WEIGHTS, ...(row.scoringWeights ?? {}) },
    defaultQuoteMin: row.defaultQuoteMin ?? 2000,
    defaultQuoteMax: row.defaultQuoteMax ?? 3000,
    pinConfigured: Boolean(row.pinHash) || Boolean(process.env.APP_PIN),
    hasPlacesKey: Boolean(placesApiKey),
    hasLlmKey: Boolean(llmApiKey),
    hasMapbox: Boolean(mapboxToken),
  };
}
