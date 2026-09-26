import { NextRequest, NextResponse } from "next/server";
import { regenerateCopy } from "@/lib/sites";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { brief?: unknown } | null;
  const extraBrief =
    typeof body?.brief === "string" ? body.brief.slice(0, 2000) : undefined;
  try {
    const site = await regenerateCopy(id, extraBrief);
    const business = await getBusinessRow(site.businessId);
    return NextResponse.json({ site, business });
  } catch (e) {
    console.error("[api/sites/generate] failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
