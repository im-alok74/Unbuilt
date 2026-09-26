import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadRequests } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { notifyUser } from "@/lib/push";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["approved", "done", "rejected"]),
  managerNote: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const [r] = await db
    .update(leadRequests)
    .set({
      status: p.data.status,
      managerNote: p.data.managerNote ?? null,
      resolvedAt: p.data.status === "approved" ? null : new Date(),
    })
    .where(eq(leadRequests.id, id))
    .returning();
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const verb = { approved: "approved", done: "fulfilled", rejected: "declined" }[p.data.status];
  await notifyUser(r.requestedBy, {
    title: "Lead request update",
    body: `Your request for ${r.niche} was ${verb}${p.data.managerNote ? `: ${p.data.managerNote}` : ""}`,
    url: "/rep/request",
  });
  return NextResponse.json({ ok: true });
}
