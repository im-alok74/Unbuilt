import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getSettingsRow } from "@/lib/settings";
import { encryptSecret, decryptSecret, maskSecret, hashPin } from "@/lib/crypto";
import { DEFAULT_PRIORITY_CATEGORIES, DEFAULT_SCORING_WEIGHTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await getSettingsRow();
  return NextResponse.json({
    llmProvider: row.llmProvider,
    priorityCategories: row.priorityCategories ?? DEFAULT_PRIORITY_CATEGORIES,
    scoringWeights: { ...DEFAULT_SCORING_WEIGHTS, ...(row.scoringWeights ?? {}) },
    defaultQuoteMin: row.defaultQuoteMin,
    defaultQuoteMax: row.defaultQuoteMax,
    placesApiKeyMask: maskSecret(decryptSecret(row.placesApiKeyEnc)),
    llmApiKeyMask: maskSecret(decryptSecret(row.llmApiKeyEnc)),
    mapboxTokenSet: Boolean(row.mapboxToken),
    mapboxToken: row.mapboxToken ?? "",
    pinSet: Boolean(row.pinHash),
    envOverrides: {
      places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      llm: Boolean(process.env.GEMINI_API_KEY),
      mapbox: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
      pin: Boolean(process.env.APP_PIN),
    },
  });
}

const patchSchema = z.object({
  placesApiKey: z.string().optional(), // "" clears
  llmProvider: z.enum(["gemini", "openai", "anthropic"]).optional(),
  llmApiKey: z.string().optional(),
  mapboxToken: z.string().optional(),
  priorityCategories: z.array(z.string().max(60)).max(100).optional(),
  scoringWeights: z
    .object({
      noWebsite: z.number().min(0).max(100),
      socialOnly: z.number().min(0).max(100),
      fewPhotos: z.number().min(0).max(100),
      underMarketed: z.number().min(0).max(100),
      priorityCategory: z.number().min(0).max(100),
    })
    .optional(),
  defaultQuoteMin: z.number().int().min(0).max(10_000_000).optional(),
  defaultQuoteMax: z.number().int().min(0).max(10_000_000).optional(),
  newPin: z.string().regex(/^\d{4,8}$/).optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const p = parsed.data;
  await getSettingsRow(); // ensure row exists

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (p.placesApiKey !== undefined) {
    set.placesApiKeyEnc = p.placesApiKey.trim() ? encryptSecret(p.placesApiKey.trim()) : null;
  }
  if (p.llmApiKey !== undefined) {
    set.llmApiKeyEnc = p.llmApiKey.trim() ? encryptSecret(p.llmApiKey.trim()) : null;
  }
  if (p.llmProvider) set.llmProvider = p.llmProvider;
  if (p.mapboxToken !== undefined) set.mapboxToken = p.mapboxToken.trim() || null;
  if (p.priorityCategories) {
    set.priorityCategories = p.priorityCategories
      .map((c) => c.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);
  }
  if (p.scoringWeights) set.scoringWeights = p.scoringWeights;
  if (typeof p.defaultQuoteMin === "number") set.defaultQuoteMin = p.defaultQuoteMin;
  if (typeof p.defaultQuoteMax === "number") set.defaultQuoteMax = p.defaultQuoteMax;
  if (p.newPin) set.pinHash = hashPin(p.newPin);

  await db.update(settings).set(set).where(eq(settings.id, 1));
  return NextResponse.json({ ok: true });
}
