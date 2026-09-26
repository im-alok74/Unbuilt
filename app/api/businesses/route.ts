import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, countBusinessRows, type ListFilters } from "@/lib/rows";
import type { LeadStatus, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const filters: ListFilters = {
    minScore: p.get("minScore") ? Number(p.get("minScore")) : undefined,
    categories: p.get("categories")?.split(",").filter(Boolean),
    noWebsiteOnly: p.get("noWebsiteOnly") === "1",
    status: p.get("status")?.split(",").filter(Boolean) as LeadStatus[] | undefined,
    stage: p.get("stage")?.split(",").filter(Boolean) as Stage[] | undefined,
    assignedTo: p.get("assignedTo") ?? undefined,
    limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    offset: p.get("offset") ? Number(p.get("offset")) : undefined,
    search: p.get("search") ?? undefined,
    sort: (p.get("sort") as ListFilters["sort"]) ?? undefined,
    dir: (p.get("dir") as ListFilters["dir"]) ?? undefined,
  };
  const rows = await listBusinessRows(filters);
  const total = p.get("total") === "1" ? await countBusinessRows(filters) : undefined;
  return NextResponse.json({ businesses: rows, total });
}
