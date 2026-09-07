import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSite } from "@/lib/sites";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  businessId: z.string().uuid(),
  template: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const site = await createSite(parsed.data.businessId, parsed.data.template);
    const business = await getBusinessRow(parsed.data.businessId);
    return NextResponse.json({ site, business });
  } catch (e) {
    console.error("[api/sites] create failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
