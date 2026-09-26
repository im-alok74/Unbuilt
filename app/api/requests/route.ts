import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadRequests, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { notifyStaff } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Reps see their own requests; staff see everyone's. */
export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const q = db
    .select({
      id: leadRequests.id,
      niche: leadRequests.niche,
      area: leadRequests.area,
      quantity: leadRequests.quantity,
      status: leadRequests.status,
      managerNote: leadRequests.managerNote,
      createdAt: leadRequests.createdAt,
      by: users.displayName,
      byId: leadRequests.requestedBy,
    })
    .from(leadRequests)
    .innerJoin(users, eq(users.id, leadRequests.requestedBy));
  const rows = await (s.role === "rep" ? q.where(eq(leadRequests.requestedBy, s.userId)) : q)
    .orderBy(desc(leadRequests.createdAt))
    .limit(100);
  return NextResponse.json({ requests: rows });
}

const schema = z.object({
  niche: z.string().trim().min(2).max(120),
  area: z.string().trim().max(120).optional(),
  quantity: z.number().int().min(1).max(200).default(20),
});

export async function POST(req: NextRequest) {
  const s = await requireSession(["rep"]);
  if (s instanceof NextResponse) return s;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Tell us the niche (e.g. gyms) and area." }, { status: 400 });
  await db.insert(leadRequests).values({
    requestedBy: s.userId,
    niche: p.data.niche,
    area: p.data.area || null,
    quantity: p.data.quantity,
  });
  await notifyStaff({
    title: "Lead request",
    body: `${s.name} wants ${p.data.quantity} ${p.data.niche}${p.data.area ? ` in ${p.data.area}` : ""}`,
    url: "/team",
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
