import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, listBusinessRowsPaged, countBusinessRows, type ListFilters } from "@/lib/rows";
import type { LeadStatus, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const page = p.get("page") ? Math.max(1, Number(p.get("page"))) : undefined;
  const pageSize = p.get("pageSize") ? Math.max(1, Number(p.get("pageSize"))) : undefined;
  const filters: ListFilters = {
    minScore: p.get("minScore") ? Number(p.get("minScore")) : undefined,
    categories: p.get("categories")?.split(",").filter(Boolean),
    noWebsiteOnly: p.get("noWebsiteOnly") === "1",
    status: p.get("status")?.split(",").filter(Boolean) as LeadStatus[] | undefined,
    stage: p.get("stage")?.split(",").filter(Boolean) as Stage[] | undefined,
    assignedTo: p.get("assignedTo") ?? undefined,
    search: p.get("search") ?? undefined,
    sort: (p.get("sort") as ListFilters["sort"]) ?? undefined,
    dir: (p.get("dir") as ListFilters["dir"]) ?? undefined,
    page,
    pageSize,
    limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    offset: p.get("offset") ? Number(p.get("offset")) : undefined,
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
