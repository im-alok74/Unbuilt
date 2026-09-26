import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, STAFF } from "@/lib/session";
import { getBusinessRow } from "@/lib/rows";
import { updateLead } from "@/lib/leads";
import { STAGES, type Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

// Legacy 4-value status (map pins, lead list) → rep pipeline stage.
const STATUS_TO_STAGE: Record<string, Stage> = { not_contacted: "new", quoted: "quoted", won: "won", lost: "lost" };

const patchSchema = z.object({
  status: z.enum(["not_contacted", "quoted", "won", "lost"]).optional(),
  stage: z.enum(STAGES as [string, ...string[]]).optional(),
  notes: z.string().max(4000).optional(),
  pitchText: z.string().max(4000).nullable().optional(),
  projectValue: z.number().int().min(1).max(100_000_000).optional(),
  commissionPaid: z.boolean().optional(),
});

/** Staff edit of any lead. :id is the business id. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status, stage, commissionPaid, ...rest } = parsed.data;
  if (commissionPaid !== undefined && s.role !== "admin") {
    return NextResponse.json({ error: "Only the admin marks commission paid." }, { status: 403 });
  }
  await updateLead(id, s.userId, {
    ...rest,
    commissionPaid,
    stage: (stage as Stage | undefined) ?? (status ? STATUS_TO_STAGE[status] : undefined),
  });
  return NextResponse.json({ business: await getBusinessRow(id) });
}
