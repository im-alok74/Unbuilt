import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, type ListFilters } from "@/lib/rows";
import type { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const filters: ListFilters = {
    minScore: p.get("minScore") ? Number(p.get("minScore")) : undefined,
    categories: p.get("categories")?.split(",").filter(Boolean),
    noWebsiteOnly: p.get("noWebsiteOnly") === "1",
    status: p.get("status")?.split(",").filter(Boolean) as LeadStatus[] | undefined,
    search: p.get("search") ?? undefined,
    sort: (p.get("sort") as ListFilters["sort"]) ?? undefined,
    dir: (p.get("dir") as ListFilters["dir"]) ?? undefined,
  };
  const rows = await listBusinessRows(filters);
  return NextResponse.json({ businesses: rows });
}
