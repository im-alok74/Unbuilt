import { NextRequest } from "next/server";
import { listBusinessRows, type ListFilters } from "@/lib/rows";
import { leadsToCsv } from "@/lib/csv";
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
  const csv = leadsToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unbuilt-leads-${stamp}.csv"`,
    },
  });
}
