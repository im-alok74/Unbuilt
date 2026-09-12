import "server-only";
import { eq, asc, desc, inArray, and, or, gte, sql, type SQL } from "drizzle-orm";
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
  /** 1-based page number. Only applied when `pageSize` is also set. */
  page?: number;
  /** Row limit per page. Omit to fetch every matching row (used by map/export/build). */
  pageSize?: number;
}

function buildConds(filters: ListFilters): SQL[] {
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
  if (filters.status && filters.status.length) {
    const statusConds = filters.status.map((s) =>
      s === "not_contacted"
        ? sql`(${leads.status} = ${s} OR ${leads.status} IS NULL)`
        : eq(leads.status, s),
    );
    conds.push(or(...statusConds)!);
  }
  return conds;
}

function orderExprs(sort: ListFilters["sort"], dir: ListFilters["dir"]) {
  const dirFn = dir === "asc" ? asc : desc;
  switch (sort) {
    case "name":
      return [dirFn(businesses.name)];
    case "rating":
      return [dirFn(sql`coalesce(${businesses.rating}, 0)`)];
    case "reviews":
      return [dirFn(businesses.reviewCount)];
    case "recent":
      return [dirFn(businesses.lastScannedAt)];
    default:
      return [dirFn(businesses.score), dirFn(businesses.reviewCount)];
  }
}

export async function listBusinessRows(filters: ListFilters = {}): Promise<BusinessRow[]> {
  const conds = buildConds(filters);
  const order = orderExprs(filters.sort ?? "score", filters.dir ?? "desc");

  const baseQuery = db
    .select({ b: businesses, l: leads, s: sites })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...order);

  const rows = filters.pageSize
    ? await baseQuery
        .limit(filters.pageSize)
        .offset((Math.max(1, filters.page ?? 1) - 1) * filters.pageSize)
    : await baseQuery;

  return rows.map(toRow);
}

/** Total rows matching `filters`, ignoring `page`/`pageSize`. */
export async function countBusinessRows(filters: ListFilters = {}): Promise<number> {
  const conds = buildConds(filters);
  const result = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .where(conds.length ? and(...conds) : undefined);
  return result[0]?.count ?? 0;
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
