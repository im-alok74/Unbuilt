import { NextResponse } from "next/server";
import { requireSession, STAFF } from "@/lib/session";
import { getBusinessRow } from "@/lib/rows";
import { updateLead } from "@/lib/leads";
import { generatePitch } from "@/lib/pitch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Generate (or regenerate) and store the pitch card for a lead. :id is the business id. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const b = await getBusinessRow(id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pitch = await generatePitch(b);
  await updateLead(id, s.userId, { pitchText: JSON.stringify(pitch) });
  return NextResponse.json({ pitch });
}
