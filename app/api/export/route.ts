import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, listNicheLeads, type ListFilters } from "@/lib/rows";
import { leadsToCsv } from "@/lib/csv";
import { getNiche, NICHES } from "@/lib/niches";
import type { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  // `has` distinguishes "no ?niche= at all" (general export) from "?niche="
  // with an empty value, which should 400 like any other unknown niche id.
  const nicheParamPresent = p.has("niche");
  const nicheId = p.get("niche");

  let rows;
  let stampSuffix = "leads";
  if (nicheParamPresent) {
    const niche = getNiche(nicheId ?? "");
    if (!niche) {
      return NextResponse.json(
        { error: `Unknown niche "${nicheId}". Valid: ${NICHES.map((n) => n.id).join(", ")}` },
        { status: 400 },
      );
    }
    rows = await listNicheLeads(niche.id);
    stampSuffix = `${niche.id}-no-website`;
  } else {
    const filters: ListFilters = {
      minScore: p.get("minScore") ? Number(p.get("minScore")) : undefined,
      categories: p.get("categories")?.split(",").filter(Boolean),
      noWebsiteOnly: p.get("noWebsiteOnly") === "1",
      status: p.get("status")?.split(",").filter(Boolean) as LeadStatus[] | undefined,
      search: p.get("search") ?? undefined,
      sort: (p.get("sort") as ListFilters["sort"]) ?? undefined,
      dir: (p.get("dir") as ListFilters["dir"]) ?? undefined,
    };
    rows = await listBusinessRows(filters);
  }

  const csv = leadsToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unbuilt-${stampSuffix}-${stamp}.csv"`,
    },
  });
}
