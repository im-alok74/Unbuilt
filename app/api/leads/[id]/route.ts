import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["not_contacted", "quoted", "won", "lost"]).optional(),
  notes: z.string().max(4000).optional(),
});

/** :id is the business id. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const patch = parsed.data;

  await db
    .insert(leads)
    .values({
      businessId: id,
      status: patch.status ?? "not_contacted",
      notes: patch.notes ?? "",
    })
    .onConflictDoUpdate({
      target: leads.businessId,
      set: {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        updatedAt: new Date(),
      },
    });

  const row = await getBusinessRow(id);
  return NextResponse.json({ business: row });
}
