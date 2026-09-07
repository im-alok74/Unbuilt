import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads } from "@/lib/db/schema";
import { getConfig } from "@/lib/settings";
import { monthlyUsage } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getConfig();

  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')`,
      contacted: sql<number>`count(*) filter (where ${leads.status} <> 'not_contacted')`,
    })
    .from(businesses)
    .leftJoin(leads, eq(leads.businessId, businesses.id));

  const usage = await monthlyUsage().catch(() => ({
    totalCalls: 0,
    liveCalls: 0,
    scanCount: 0,
  }));

  return NextResponse.json({
    hasMapbox: cfg.hasMapbox,
    mapboxToken: cfg.mapboxToken, // public pk.* token — safe for the browser
    hasPlacesKey: cfg.hasPlacesKey,
    hasLlmKey: cfg.hasLlmKey,
    llmProvider: cfg.llmProvider,
    priorityCategories: cfg.priorityCategories,
    scoringWeights: cfg.scoringWeights,
    defaultQuoteMin: cfg.defaultQuoteMin,
    defaultQuoteMax: cfg.defaultQuoteMax,
    mock: !cfg.hasPlacesKey,
    counts: {
      total: Number(counts?.total ?? 0),
      won: Number(counts?.won ?? 0),
      contacted: Number(counts?.contacted ?? 0),
    },
    usage,
  });
}
