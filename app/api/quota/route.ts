import { NextResponse } from "next/server";
import { monthlyUsage } from "@/lib/places";
import { getConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Google's March-2025 model gives per-SKU monthly free call volumes. These are
// conservative placeholders for the meter — confirm the live numbers in the
// Google Cloud console → APIs & Services → Places API (New) → Quotas.
const FREE_NEARBY_ENTERPRISE = 1000;

export async function GET() {
  const cfg = await getConfig();
  const usage = await monthlyUsage();
  const cap = FREE_NEARBY_ENTERPRISE;
  const used = usage.liveCalls;
  return NextResponse.json({
    live: cfg.hasPlacesKey,
    used,
    cap,
    remaining: Math.max(0, cap - used),
    pct: Math.min(100, Math.round((used / cap) * 100)),
    totalCalls: usage.totalCalls,
    scanCount: usage.scanCount,
    note: "Free-tier estimate for the Nearby Search (Enterprise) SKU. Verify current limits in Google Cloud.",
  });
}
