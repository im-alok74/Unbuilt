import "server-only";
import { unstable_cache } from "next/cache";
import { eq, asc, desc, inArray, and, or, gte, sql, isNull, getTableColumns, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, sites, users } from "@/lib/db/schema";
import type { BusinessRow, LeadStatus, Stage } from "@/lib/types";
import { getNiche } from "@/lib/niches";
import { LEADS_LIST_TAG, NICHE_LEADS_TAG } from "@/lib/cache";

// raw_json is write-only (never read) and huge; selecting it burned Neon's 5 GB egress cap.
// Lists also skip photos/hours/score breakdown (only the detail view needs them).
const { rawJson: _raw, ...fullCols } = getTableColumns(businesses);
const { photosJson: _p, hoursJson: _h, scoreBreakdown: _s, ...slimCols } = fullCols;
const sel = { b: fullCols, l: leads, s: sites, u: { name: users.displayName } };
const selSlim = { b: slimCols, l: leads, s: sites, u: { name: users.displayName } };

const STALE_MS = 30 * 24 * 60 * 60 * 1000; // Places content cache limit

function toRow(r: {
  b: Omit<typeof businesses.$inferSelect, "rawJson" | "photosJson" | "hoursJson" | "scoreBreakdown"> &
    Partial<Pick<typeof businesses.$inferSelect, "photosJson" | "hoursJson" | "scoreBreakdown">>;
  l: typeof leads.$inferSelect | null;
  s: typeof sites.$inferSelect | null;
  u: { name: string | null } | null;
}): BusinessRow {
  const { b, l, s, u } = r;
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
    stage: (l?.stage ?? "new") as Stage,
    assignedTo: l?.assignedTo ?? null,
    assignedToName: u?.name ?? null,
    nextFollowUp: l?.nextFollowUp?.toISOString() ?? null,
    pitchText: l?.pitchText ?? null,
    projectValue: l?.projectValue ?? null,
    quotePackage: l?.quotePackage ?? null,
    quoteAmount: l?.quoteAmount ?? null,
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
  stage?: Stage[];
  search?: string;
  /** "unassigned" | user id. Reps are always forced to their own id by the API. */
  assignedTo?: string;
  sort?: "score" | "name" | "rating" | "reviews" | "recent";
  dir?: "asc" | "desc";
  /** 1-based page number. Only applied when `pageSize` is also set. */
  page?: number;
  pageSize?: number;
  /** Plain limit/offset alternative to page/pageSize. Without either, up to 5000 rows (map, export). */
  limit?: number;
  offset?: number;
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
  if (filters.assignedTo === "unassigned") conds.push(isNull(leads.assignedTo));
  else if (filters.assignedTo) conds.push(eq(leads.assignedTo, filters.assignedTo));
  if (filters.status && filters.status.length) {
    conds.push(sql`coalesce(${leads.status}::text, 'not_contacted') in ${filters.status}`);
  }
  if (filters.stage && filters.stage.length) {
    conds.push(sql`coalesce(${leads.stage}, 'new') in ${filters.stage}`);
  }
  if (filters.search && filters.search.trim()) {
    conds.push(sql`${businesses.name} ilike ${"%" + filters.search.trim() + "%"}`);
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

function listQuery(f: ListFilters) {
  const win = f.pageSize
    ? { limit: Math.min(f.pageSize, 5000), offset: (Math.max(1, f.page ?? 1) - 1) * f.pageSize }
    : { limit: Math.min(f.limit ?? 5000, 5000), offset: f.offset ?? 0 };
  return { conds: buildConds(f), order: orderExprs(f.sort ?? "score", f.dir ?? "desc"), ...win };
}

export async function listBusinessRows(filters: ListFilters = {}): Promise<BusinessRow[]> {
  const { conds, limit, offset, order } = listQuery(filters);
  const rows = await db
    .select(selSlim)
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
  return rows.map(toRow);
}

/** Total rows matching `filters`, ignoring paging. */
export async function countBusinessRows(filters: ListFilters = {}): Promise<number> {
  const conds = buildConds(filters);
  const result = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .where(conds.length ? and(...conds) : undefined);
  return result[0]?.count ?? 0;
}

/** A page plus the matching total in one round trip (`count(*) over()`). */
async function listBusinessRowsPagedUncached(filters: ListFilters = {}): Promise<{ rows: BusinessRow[]; total: number }> {
  const { conds, limit, offset, order } = listQuery(filters);
  const results = await db
    .select({ ...selSlim, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
  if (results.length === 0) {
    // Truly no matches, or the page is past the end.
    return { rows: [], total: await countBusinessRows(filters) };
  }
  return { rows: results.map(toRow), total: results[0].total };
}

/**
 * Cached for a short window so repeat loads / SWR revalidation with the same filters skip Postgres,
 * the main lever for keeping database egress low. Every write path calls revalidateLeadsCache().
 */
export const listBusinessRowsPaged = unstable_cache(listBusinessRowsPagedUncached, ["businesses-list-paged"], {
  revalidate: 30,
  tags: [LEADS_LIST_TAG],
});

/**
 * Leads for a "download by niche" preset (lib/niches.ts): always businesses with no real website,
 * optionally gated to a rating/review quality bar.
 */
async function listNicheLeadsUncached(nicheId: string): Promise<BusinessRow[]> {
  const niche = getNiche(nicheId);
  if (!niche) return [];

  const matchConds: SQL[] = [];
  if (niche.types.length) {
    matchConds.push(inArray(businesses.category, niche.types), sql`${businesses.types} ?| array[${sql.join(niche.types.map((t) => sql`${t}`), sql`, `)}]::text[]`);
  }
  if (niche.keywords?.length) {
    // `\y` is Postgres's word-boundary escape (not `\b`, which ARE regex treats as a literal backspace),
    // which keeps "ngo" from matching "Bingo".
    const pattern = `\\y(${niche.keywords.join("|")})\\y`;
    matchConds.push(sql`(${businesses.name} ~* ${pattern} OR ${businesses.categoryLabel} ~* ${pattern})`);
  }

  const conds: SQL[] = [inArray(businesses.websiteStatus, ["none", "social"]), or(...matchConds)!];
  if (niche.qualityFilter) {
    conds.push(sql`${businesses.rating} >= 4.0 AND ${businesses.reviewCount} >= 10`);
  }

  const rows = await db
    .select(selSlim)
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(and(...conds))
    .orderBy(desc(businesses.score), desc(businesses.reviewCount));

  return rows.map(toRow);
}

export const listNicheLeads = unstable_cache(listNicheLeadsUncached, ["niche-leads"], {
  revalidate: 120,
  tags: [NICHE_LEADS_TAG],
});

export async function getBusinessRow(id: string): Promise<BusinessRow | null> {
  const rows = await db
    .select(sel)
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(eq(businesses.id, id))
    .limit(1);
  return rows[0] ? toRow(rows[0]) : null;
}

export async function getBusinessRowsByIds(ids: string[]): Promise<BusinessRow[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select(selSlim)
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(inArray(businesses.id, ids));
  return rows.map(toRow);
}
