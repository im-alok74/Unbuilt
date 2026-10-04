import { requireSession, STAFF } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { listBusinessRows, listNicheLeads, type ListFilters } from "@/lib/rows";
import { leadsToCsv } from "@/lib/csv";
import { getNiche, NICHES } from "@/lib/niches";
import type { LeadStatus } from "@/lib/types";

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
      minScore: int(p.get("minScore"), 100),
      categories: p.get("categories")?.split(",").filter(Boolean),
      noWebsiteOnly: p.get("noWebsiteOnly") === "1",
      status: picks<LeadStatus>(p.get("status"), STATUSES),
      search: p.get("search") ?? undefined,
      sort: pick(p.get("sort"), SORTS),
      dir: pick(p.get("dir"), ["asc", "desc"] as const),
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
