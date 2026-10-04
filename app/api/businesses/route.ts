import { requireSession, STAFF } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, listBusinessRowsPaged, countBusinessRows, type ListFilters } from "@/lib/rows";
import { STAGES, type LeadStatus, type Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORTS = ["area", "score", "name", "rating", "reviews", "recent"] as const;
const STATUSES = ["not_contacted", "quoted", "won", "lost"] as const;

function int(v: string | null, max: number, min = 0): number | undefined {
  if (v === null || !/^\d+$/.test(v)) return undefined;
  return Math.min(Math.max(Number(v), min), max);
}
function pick<T extends string>(v: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === v);
}
function picks<T extends string>(v: string | null, allowed: readonly T[]): T[] | undefined {
  const l = (v?.split(",") ?? []).filter((x): x is T => (allowed as readonly string[]).includes(x));
  return l.length ? l : undefined;
}

export async function GET(req: NextRequest) {
  const _auth = await requireSession(STAFF);
  if (_auth instanceof NextResponse) return _auth;
  const p = req.nextUrl.searchParams;
  const page = int(p.get("page"), 100000, 1);
  const pageSize = int(p.get("pageSize"), 200, 1);
  const filters: ListFilters = {
    minScore: int(p.get("minScore"), 100),
    categories: p.get("categories")?.split(",").filter(Boolean),
    noWebsiteOnly: p.get("noWebsiteOnly") === "1",
    status: picks<LeadStatus>(p.get("status"), STATUSES),
    stage: picks<Stage>(p.get("stage"), STAGES),
    assignedTo: p.get("assignedTo") ?? undefined,
    search: p.get("search") ?? undefined,
    area: p.get("area") ?? undefined,
    sort: pick(p.get("sort"), SORTS),
    dir: pick(p.get("dir"), ["asc", "desc"] as const),
    page,
    pageSize,
    limit: int(p.get("limit"), 5000, 1),
    offset: int(p.get("offset"), 100000),
  };

  // Page-based callers (the Sites list) get the cached page + total.
  if (pageSize) {
    const { rows, total } = await listBusinessRowsPaged(filters);
    return NextResponse.json({ businesses: rows, total, page: page ?? 1, pageSize });
  }

  // Everyone else: plain list (map), or limit/offset + total=1 (the lead pool).
  const rows = await listBusinessRows(filters);
  const total = p.get("total") === "1" ? await countBusinessRows(filters) : rows.length;
  return NextResponse.json({ businesses: rows, total, page: 1, pageSize: rows.length });
}
