import "server-only";
import { eq, desc, inArray, and, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, sites } from "@/lib/db/schema";
import type { BusinessRow, LeadStatus } from "@/lib/types";

const STALE_MS = 30 * 24 * 60 * 60 * 1000; // Places content cache limit

function toRow(r: {
  b: typeof businesses.$inferSelect;
  l: typeof leads.$inferSelect | null;
  s: typeof sites.$inferSelect | null;
}): BusinessRow {
  const { b, l, s } = r;
  return {
    id: b.id,
    placeId: b.placeId,
    name: b.name,
    category: b.category,
    categoryLabel: b.categoryLabel,
    types: b.types ?? [],
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    phone: b.phone,
    websiteRaw: b.websiteRaw,
    websiteStatus: b.websiteStatus,
    hasWebsite: b.websiteStatus === "real",
    rating: b.rating,
    reviewCount: b.reviewCount,
    photoCount: b.photoCount,
    photos: b.photosJson ?? [],
    businessStatus: b.businessStatus,
    hours: b.hoursJson ?? null,
    score: b.score,
    scoreBreakdown: b.scoreBreakdown ?? [],
    leadStatus: (l?.status ?? "not_contacted") as LeadStatus,
    notes: l?.notes ?? "",
    siteStatus: s?.status ?? null,
    siteId: s?.id ?? null,
    siteSlug: s?.slug ?? null,
    quotePrice: s?.quotePrice ?? null,
    lastScannedAt: b.lastScannedAt.toISOString(),
    stale: Date.now() - b.lastScannedAt.getTime() > STALE_MS,
  };
}

export interface ListFilters {
  minScore?: number;
  categories?: string[];
  noWebsiteOnly?: boolean;
  status?: LeadStatus[];
  search?: string;
  sort?: "score" | "name" | "rating" | "reviews" | "recent";
  dir?: "asc" | "desc";
}

export async function listBusinessRows(filters: ListFilters = {}): Promise<BusinessRow[]> {
  const conds: SQL[] = [];
  if (typeof filters.minScore === "number" && filters.minScore > 0) {
    conds.push(gte(businesses.score, filters.minScore));
  }
  if (filters.categories && filters.categories.length) {
    conds.push(inArray(businesses.category, filters.categories));
  }
  if (filters.noWebsiteOnly) {
    conds.push(inArray(businesses.websiteStatus, ["none", "social"]));
  }
  if (filters.search && filters.search.trim()) {
    conds.push(sql`${businesses.name} ilike ${"%" + filters.search.trim() + "%"}`);
  }

  const rows = await db
    .select({ b: businesses, l: leads, s: sites })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(businesses.score), desc(businesses.reviewCount));

  let result = rows.map(toRow);

  if (filters.status && filters.status.length) {
    const set = new Set(filters.status);
    result = result.filter((r) => set.has(r.leadStatus));
  }

  const sortKey = filters.sort ?? "score";
  const dir = filters.dir ?? "desc";
  const mul = dir === "asc" ? 1 : -1;
  result.sort((a, b) => {
    switch (sortKey) {
      case "name":
        return mul * a.name.localeCompare(b.name);
      case "rating":
        return mul * ((a.rating ?? 0) - (b.rating ?? 0));
      case "reviews":
        return mul * (a.reviewCount - b.reviewCount);
      case "recent":
        return mul * (Date.parse(a.lastScannedAt) - Date.parse(b.lastScannedAt));
      default:
        return mul * (a.score - b.score);
    }
  });

  return result;
}

export async function getBusinessRow(id: string): Promise<BusinessRow | null> {
  const rows = await db
    .select({ b: businesses, l: leads, s: sites })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .where(eq(businesses.id, id))
    .limit(1);
  return rows[0] ? toRow(rows[0]) : null;
}

export async function getBusinessRowsByIds(ids: string[]): Promise<BusinessRow[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ b: businesses, l: leads, s: sites })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .where(inArray(businesses.id, ids));
  return rows.map(toRow);
}
