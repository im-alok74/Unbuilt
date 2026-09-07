import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runScan, estimateScan } from "@/lib/places";
import { getBusinessRowsByIds } from "@/lib/rows";
import { getConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(200).max(10000),
  includedTypes: z.array(z.string()).optional(),
  allBusinesses: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const radius = Number(req.nextUrl.searchParams.get("radiusM") ?? "1000");
  const cfg = await getConfig();
  const est = estimateScan(Math.min(Math.max(radius, 200), 10000));
  return NextResponse.json({ ...est, mock: !cfg.hasPlacesKey });
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const outcome = await runScan(parsed.data);
    const rows = await getBusinessRowsByIds(outcome.businessIds);
    return NextResponse.json({
      ...outcome,
      businesses: rows,
    });
  } catch (e) {
    console.error("[api/scan] failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "scan failed" },
      { status: 500 },
    );
  }
}
