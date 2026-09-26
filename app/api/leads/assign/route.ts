import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, ne, notInArray, sql, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, leadActivity, users, dnc } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { normPhoneSql } from "@/lib/phone";
import { notifyUser } from "@/lib/push";

export const dynamic = "force-dynamic";

const schema = z.object({
  businessIds: z.array(z.string().uuid()).min(1).max(500),
  /** One rep, or null to unassign. */
  userId: z.string().uuid().nullable().optional(),
  /** Round-robin across these reps (overrides userId). */
  userIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  /** Assign even if another rep already has a lead with the same phone. */
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { businessIds, userId, userIds, force } = p.data;

  // Unassign
  if (!userIds && userId === null) {
    await db
      .update(leads)
      .set({ assignedTo: null, assignedAt: null, updatedAt: new Date() })
      .where(inArray(leads.businessId, businessIds));
    return NextResponse.json({ assigned: 0, unassigned: businessIds.length });
  }

  const targets = userIds ?? (userId ? [userId] : []);
  if (!targets.length) return NextResponse.json({ error: "Pick a rep" }, { status: 400 });
  const reps = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, targets), eq(users.role, "rep"), eq(users.isActive, true)));
  if (reps.length !== new Set(targets).size) {
    return NextResponse.json({ error: "Every target must be an active rep" }, { status: 400 });
  }

  // Phone + name for each business; drop do-not-contact numbers.
  const biz = await db
    .select({ id: businesses.id, name: businesses.name, phone: normPhoneSql(businesses.phone) })
    .from(businesses)
    .where(inArray(businesses.id, businessIds));
  const dncRows = await db.select({ phone: dnc.phone }).from(dnc);
  const dncSet = new Set(dncRows.map((r) => r.phone));
  const skippedDnc = biz.filter((b) => b.phone && dncSet.has(b.phone)).map((b) => b.name);
  let ok = biz.filter((b) => !(b.phone && dncSet.has(b.phone)));

  // Duplicate guard: same phone already worked by a different rep on another record.
  const conflicts: { id: string; name: string }[] = [];
  if (!force) {
    const phones = [...new Set(ok.map((b) => b.phone).filter(Boolean))];
    if (phones.length) {
      const held = await db
        .select({ phone: normPhoneSql(businesses.phone), rep: leads.assignedTo, bid: businesses.id })
        .from(leads)
        .innerJoin(businesses, eq(businesses.id, leads.businessId))
        .where(
          and(
            isNotNull(leads.assignedTo),
            ne(leads.stage, "lost"),
            notInArray(businesses.id, ok.map((b) => b.id)),
            inArray(normPhoneSql(businesses.phone), phones),
          ),
        );
      const heldBy = new Map(held.map((h) => [h.phone, h.rep]));
      ok = ok.filter((b) => {
        const rep = b.phone ? heldBy.get(b.phone) : undefined;
        if (rep && !targets.includes(rep)) {
          conflicts.push({ id: b.id, name: b.name });
          return false;
        }
        return true;
      });
    }
  }

  const now = new Date();
  const target = (i: number) => targets[i % targets.length];
  const rows = ok.map((b, i) => ({ businessId: b.id, assignedTo: target(i), assignedAt: now }));
  const byBiz = new Map(rows.map((r) => [r.businessId, r.assignedTo]));
  if (rows.length) {
    const up = await db
      .insert(leads)
      .values(rows)
      .onConflictDoUpdate({
        target: leads.businessId,
        set: { assignedTo: sql`excluded.assigned_to`, assignedAt: sql`excluded.assigned_at`, updatedAt: now },
      })
      .returning({ id: leads.id, businessId: leads.businessId });
    await db.insert(leadActivity).values(
      up.map((l) => ({ leadId: l.id, userId: s.userId, action: "assigned", detail: byBiz.get(l.businessId) ?? null })),
    );
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.assignedTo, (counts.get(r.assignedTo) ?? 0) + 1);
    await Promise.all(
      [...counts].map(([uid, n]) =>
        notifyUser(uid, { title: "New leads", body: `${n} new lead${n === 1 ? "" : "s"} assigned to you`, url: "/rep" }),
      ),
    );
  }

  return NextResponse.json({ assigned: rows.length, skippedDnc, conflicts });
}
