import "server-only";
import { sql, inArray, and, gte, between, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, scans } from "@/lib/db/schema";
import { getConfig } from "@/lib/settings";
import { scoreBusiness } from "@/lib/scoring/score";
import type { NormalizedBusiness } from "@/lib/types";
import { distanceMeters } from "@/lib/utils";
import { planTiles } from "./tiles";
import { searchTile } from "./client";
import { mockSearch } from "./mock";

export { planTiles, estimateScan } from "./tiles";

// Valid Place types that Nearby Search (New) rejects as an `includedType` filter,
// even though they appear as `primaryType` on results. Kept out of the API call
// but still usable for scoring.
const NOT_SEARCHABLE = new Set([
  "general_contractor",
  "point_of_interest",
  "establishment",
]);

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
  /** True when the area was scanned recently, so no Places calls were spent. */
  cached?: boolean;
}

const BUDGET_LIMIT = Number(process.env.PLACES_MONTHLY_LIMIT ?? 1000);
const BUDGET_RESERVE = 100; // never spend the last 100 calls on scans
const CACHE_DAYS = 60;

export async function placesBudget() {
  const u = await monthlyUsage();
  const used = u.liveCalls;
  return { limit: BUDGET_LIMIT, used, remaining: Math.max(0, BUDGET_LIMIT - used), warn: used >= BUDGET_LIMIT * 0.7, blocked: used >= BUDGET_LIMIT - BUDGET_RESERVE };
}

/** Businesses already in the DB for an area that a live scan fully covered in the last CACHE_DAYS. */
async function cachedArea(lat: number, lng: number, radiusM: number): Promise<string[] | null> {
  const since = new Date(Date.now() - CACHE_DAYS * 86_400_000);
  const recent = await db
    .select({ lat: scans.lat, lng: scans.lng, radiusM: scans.radiusM })
    .from(scans)
    .where(and(eq(scans.mock, false), gte(scans.ranAt, since)));
  const covered = recent.some((r) => distanceMeters({ lat, lng }, r) + radiusM <= r.radiusM);
  if (!covered) return null;
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const rows = await db
    .select({ id: businesses.id, lat: businesses.lat, lng: businesses.lng })
    .from(businesses)
    .where(and(between(businesses.lat, lat - dLat, lat + dLat), between(businesses.lng, lng - dLng, lng + dLng)));
  return rows
    .filter((r) => r.lat != null && r.lng != null && distanceMeters({ lat, lng }, { lat: r.lat!, lng: r.lng! }) <= radiusM)
    .map((r) => r.id);
}

export async function runScan(args: ScanArgs): Promise<ScanOutcome> {
  const cfg = await getConfig();
  const tiles = planTiles({ lat: args.lat, lng: args.lng }, args.radiusM);
  const rawTypes =
    args.includedTypes && args.includedTypes.length
      ? args.includedTypes
      : cfg.priorityCategories;
  const includedTypes = args.allBusinesses
    ? undefined
    : rawTypes.filter((t) => !NOT_SEARCHABLE.has(t));

  const mock = !cfg.hasPlacesKey;
  if (!mock) {
    const hit = await cachedArea(args.lat, args.lng, args.radiusM);
    if (hit) return { mock, apiCalls: 0, resultCount: hit.length, newCount: 0, businessIds: hit, cached: true };
  }
  const collected = new Map<string, NormalizedBusiness>();
  let apiCalls = 0;

  // Demo mode: one synthetic batch for the whole area, not one per tile.
  const workTiles = mock
    ? [{ lat: args.lat, lng: args.lng, radius: args.radiusM }]
    : tiles;

  if (!mock) {
    const b = await placesBudget();
    if (b.used + workTiles.length > b.limit - BUDGET_RESERVE) {
      throw new Error(
        `Monthly Places budget: ${b.used}/${b.limit} calls used and this scan needs ${workTiles.length}. Shrink the radius or wait for next month.`,
      );
    }
  }

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
      lastScannedAt: now,
    }));

    // Bulk upsert in small chunks. Each chunk is isolated so one bad row can't
    // lose the whole scan — every business the Places API returned gets persisted.
    const CHUNK = 40;
    const conflictSet = {
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
      lastScannedAt: sql`excluded.last_scanned_at`,
    };

    for (let i = 0; i < values.length; i += CHUNK) {
      const chunk = values.slice(i, i + CHUNK);
      try {
        const upserted = await db
          .insert(businesses)
          .values(chunk)
          .onConflictDoUpdate({ target: businesses.placeId, set: conflictSet })
          .returning({ id: businesses.id });
        for (const r of upserted) businessIds.push(r.id);
      } catch (err) {
        console.error("[scan] chunk upsert failed, retrying rows individually", err);
        for (const row of chunk) {
          try {
            const one = await db
              .insert(businesses)
              .values(row)
              .onConflictDoUpdate({ target: businesses.placeId, set: conflictSet })
              .returning({ id: businesses.id });
            if (one[0]) businessIds.push(one[0].id);
          } catch (e2) {
            console.error("[scan] row upsert failed", row.placeId, e2);
          }
        }
      }
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
