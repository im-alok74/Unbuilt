import "server-only";
import { eq, desc, asc, inArray, and, gte, sql, isNull, getTableColumns, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, sites, users } from "@/lib/db/schema";
import type { BusinessRow, LeadStatus, Stage } from "@/lib/types";

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
  limit?: number;
  offset?: number;
}

function whereFor(filters: ListFilters): SQL | undefined {
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
  return conds.length ? and(...conds) : undefined;
}

export async function listBusinessRows(filters: ListFilters = {}): Promise<BusinessRow[]> {
  const dir = filters.dir ?? "desc";
  const d = dir === "asc" ? asc : desc;
  const col = {
    name: businesses.name,
    rating: businesses.rating,
    reviews: businesses.reviewCount,
    recent: businesses.lastScannedAt,
    score: businesses.score,
  }[filters.sort ?? "score"];
  const rows = await db
    .select(selSlim)
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .leftJoin(sites, eq(sites.businessId, businesses.id))
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(whereFor(filters))
    .orderBy(d(col), desc(businesses.reviewCount))
    .limit(Math.min(filters.limit ?? 2000, 5000))
    .offset(filters.offset ?? 0);
  return rows.map(toRow);
}

export async function countBusinessRows(filters: ListFilters = {}): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id))
    .where(whereFor(filters));
  return Number(r?.n ?? 0);
}

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
