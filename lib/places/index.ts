import "server-only";
import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, scans } from "@/lib/db/schema";
import { getConfig } from "@/lib/settings";
import { scoreBusiness } from "@/lib/scoring/score";
import type { NormalizedBusiness } from "@/lib/types";
import { planTiles } from "./tiles";
import { searchTile } from "./client";
import { mockSearch } from "./mock";

export { planTiles, estimateScan } from "./tiles";

export interface ScanArgs {
  lat: number;
  lng: number;
  radiusM: number;
  includedTypes?: string[];
  allBusinesses?: boolean;
}

export interface ScanOutcome {
  mock: boolean;
  apiCalls: number;
  resultCount: number;
  newCount: number;
  businessIds: string[];
}

export async function runScan(args: ScanArgs): Promise<ScanOutcome> {
  const cfg = await getConfig();
  const tiles = planTiles({ lat: args.lat, lng: args.lng }, args.radiusM);
  const includedTypes = args.allBusinesses
    ? undefined
    : args.includedTypes && args.includedTypes.length
      ? args.includedTypes
      : cfg.priorityCategories;

  const mock = !cfg.hasPlacesKey;
  const collected = new Map<string, NormalizedBusiness>();
  let apiCalls = 0;

  // Demo mode: one synthetic batch for the whole area, not one per tile.
  const workTiles = mock
    ? [{ lat: args.lat, lng: args.lng, radius: args.radiusM }]
    : tiles;

  for (const tile of workTiles) {
    apiCalls++;
    let found: NormalizedBusiness[];
    if (mock) {
      found = mockSearch({ lat: args.lat, lng: args.lng }, args.radiusM, includedTypes);
    } else {
      try {
        found = await searchTile(tile, cfg.placesApiKey!, includedTypes);
      } catch (err) {
        console.error("[scan] tile failed", err);
        found = [];
      }
    }
    for (const b of found) {
      if (!collected.has(b.placeId)) collected.set(b.placeId, b);
    }
  }

  const list = [...collected.values()];

  // Score everything against current weights + priority list.
  const scored = list.map((b) => {
    const { score, factors } = scoreBusiness(
      {
        websiteStatus: b.websiteStatus,
        photoCount: b.photoCount,
        reviewCount: b.reviewCount,
        rating: b.rating,
        types: b.types,
      },
      cfg.scoringWeights,
      cfg.priorityCategories,
    );
    return { b, score, factors };
  });

  const businessIds: string[] = [];
  let newCount = 0;

  if (scored.length > 0) {
    const placeIds = scored.map((s) => s.b.placeId);
    const existing = await db
      .select({ placeId: businesses.placeId })
      .from(businesses)
      .where(inArray(businesses.placeId, placeIds));
    const existingSet = new Set(existing.map((e) => e.placeId));
    newCount = placeIds.filter((p) => !existingSet.has(p)).length;

    const now = new Date();
    const values = scored.map((s) => ({
      placeId: s.b.placeId,
      name: s.b.name,
      category: s.b.category,
      categoryLabel: s.b.categoryLabel,
      types: s.b.types,
      address: s.b.address,
      lat: s.b.lat,
      lng: s.b.lng,
      phone: s.b.phone,
      websiteRaw: s.b.websiteRaw,
      websiteStatus: s.b.websiteStatus,
      rating: s.b.rating,
      reviewCount: s.b.reviewCount,
      photoCount: s.b.photoCount,
      businessStatus: s.b.businessStatus,
      hoursJson: s.b.hours,
      photosJson: s.b.photos,
      score: s.score,
      scoreBreakdown: s.factors,
      rawJson: s.b.raw as object,
      lastScannedAt: now,
    }));

    // Bulk upsert in chunks (keeps each statement well within limits).
    const CHUNK = 100;
    for (let i = 0; i < values.length; i += CHUNK) {
      const upserted = await db
        .insert(businesses)
        .values(values.slice(i, i + CHUNK))
        .onConflictDoUpdate({
          target: businesses.placeId,
          set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            categoryLabel: sql`excluded.category_label`,
            types: sql`excluded.types`,
            address: sql`excluded.address`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
            phone: sql`excluded.phone`,
            websiteRaw: sql`excluded.website_raw`,
            websiteStatus: sql`excluded.website_status`,
            rating: sql`excluded.rating`,
            reviewCount: sql`excluded.review_count`,
            photoCount: sql`excluded.photo_count`,
            businessStatus: sql`excluded.business_status`,
            hoursJson: sql`excluded.hours_json`,
            photosJson: sql`excluded.photos_json`,
            score: sql`excluded.score`,
            scoreBreakdown: sql`excluded.score_breakdown`,
            rawJson: sql`excluded.raw_json`,
            lastScannedAt: sql`excluded.last_scanned_at`,
          },
        })
        .returning({ id: businesses.id });
      for (const r of upserted) businessIds.push(r.id);
    }

    if (businessIds.length) {
      await db
        .insert(leads)
        .values(businessIds.map((businessId) => ({ businessId })))
        .onConflictDoNothing();
    }
  }

  await db.insert(scans).values({
    lat: args.lat,
    lng: args.lng,
    radiusM: args.radiusM,
    apiCalls,
    resultCount: scored.length,
    newCount,
    mock,
  });

  return {
    mock,
    apiCalls,
    resultCount: scored.length,
    newCount,
    businessIds,
  };
}

/** Monthly usage summary for the quota meter. */
export async function monthlyUsage() {
  const rows = await db
    .select({
      calls: sql<number>`coalesce(sum(${scans.apiCalls}), 0)`,
      scanCount: sql<number>`count(*)`,
      liveCalls: sql<number>`coalesce(sum(case when ${scans.mock} = false then ${scans.apiCalls} else 0 end), 0)`,
    })
    .from(scans)
    .where(sql`${scans.ranAt} >= date_trunc('month', now())`);
  const r = rows[0] ?? { calls: 0, scanCount: 0, liveCalls: 0 };
  return {
    totalCalls: Number(r.calls),
    liveCalls: Number(r.liveCalls),
    scanCount: Number(r.scanCount),
  };
}
