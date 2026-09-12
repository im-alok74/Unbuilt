import { NextRequest, NextResponse } from "next/server";
import { listBusinessRowsPaged, type ListFilters } from "@/lib/rows";
import type { LeadStatus } from "@/lib/types";

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
    search: p.get("search") ?? undefined,
    sort: (p.get("sort") as ListFilters["sort"]) ?? undefined,
    dir: (p.get("dir") as ListFilters["dir"]) ?? undefined,
    page,
    pageSize,
  };
  const { rows, total } = await listBusinessRowsPaged(filters);
  return NextResponse.json({
    businesses: rows,
    total,
    page: page ?? 1,
    pageSize: pageSize ?? rows.length,
  });
}
