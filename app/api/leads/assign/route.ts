import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, ne, notInArray, or, sql, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, leadActivity, users, dnc } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { normPhone } from "@/lib/area";
import { ensurePhoneKeys } from "@/lib/phonekeys";
import { notifyUser } from "@/lib/push";
import { revalidateLeadsCache } from "@/lib/cache";

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
    revalidateLeadsCache();
    return NextResponse.json({ assigned: 0, unassigned: businessIds.length });
  }

  const targets = userIds ?? (userId ? [userId] : []);
  if (!targets.length) return NextResponse.json({ error: "Pick a rep" }, { status: 400 });
  const reps = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, targets), eq(users.isActive, true)));
  if (reps.length !== new Set(targets).size) {
    return NextResponse.json({ error: "Every target must be an active user" }, { status: 400 });
  }

  // Phone + name for each business; drop do-not-contact numbers.
  await ensurePhoneKeys();
  const bizRows = await db
    .select({ id: businesses.id, name: businesses.name, key: businesses.phoneKey, phone: businesses.phone, area: businesses.area, address: businesses.address })
    .from(businesses)
    .where(inArray(businesses.id, businessIds));
  const biz = bizRows.map((b) => ({ id: b.id, name: b.name, phone: b.key ?? normPhone(b.phone, `${b.area ?? ""} ${b.address ?? ""}`) }));
  const allKeys = [...new Set(biz.map((b) => b.phone).filter(Boolean))].sort();
  const dncRows = allKeys.length ? await db.select({ phone: dnc.phone }).from(dnc).where(inArray(dnc.phone, allKeys)) : [];
  const dncSet = new Set(dncRows.map((r) => r.phone));
  const skippedDnc = biz.filter((b) => b.phone && dncSet.has(b.phone)).map((b) => b.name);
  const candidates = biz.filter((b) => !(b.phone && dncSet.has(b.phone)));
  const keys = [...new Set(candidates.map((b) => b.phone).filter(Boolean))].sort();

  const conflicts: { id: string; name: string }[] = [];
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    // Serialise concurrent assigns of the same number (sorted order avoids deadlocks).
    for (const k of keys) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${k}))`);

    // Duplicate guard: same phone already worked by a different rep on another record.
    let ok = candidates;
    if (!force && keys.length) {
      const held = await tx
        .select({ phone: businesses.phoneKey, rep: leads.assignedTo })
        .from(leads)
        .innerJoin(businesses, eq(businesses.id, leads.businessId))
        .where(
          and(
            isNotNull(leads.assignedTo),
            ne(leads.stage, "lost"),
            notInArray(businesses.id, candidates.map((b) => b.id)),
            inArray(businesses.phoneKey, keys),
          ),
        );
      const heldBy = new Map(held.map((h) => [h.phone ?? "", h.rep]));
      ok = candidates.filter((b) => {
        const rep = b.phone ? heldBy.get(b.phone) : undefined;
        if (rep && !targets.includes(rep)) {
          conflicts.push({ id: b.id, name: b.name });
          return false;
        }
        return true;
      });
    }

    // Same phone twice in one batch goes to the same rep (round-robin advances per distinct number).
    const repForKey = new Map<string, string>();
    let n = 0;
    const rows = ok.map((b) => {
      let rep = b.phone ? repForKey.get(b.phone) : undefined;
      if (!rep) {
        rep = targets[n++ % targets.length];
        if (b.phone) repForKey.set(b.phone, rep);
      }
      return { businessId: b.id, assignedTo: rep, assignedAt: now };
    });
    if (!rows.length) return { rows: [] as typeof rows, up: [] as { id: string; businessId: string }[] };

    // Don't steal a lead another rep already holds unless forced.
    const up = await tx
      .insert(leads)
      .values(rows)
      .onConflictDoUpdate({
        target: leads.businessId,
        set: { assignedTo: sql`excluded.assigned_to`, assignedAt: sql`excluded.assigned_at`, updatedAt: now },
        ...(force ? {} : { setWhere: or(isNull(leads.assignedTo), sql`${leads.assignedTo} = excluded.assigned_to`) }),
      })
      .returning({ id: leads.id, businessId: leads.businessId });
    const done = new Set(up.map((l) => l.businessId));
    for (const b of ok) if (!done.has(b.id)) conflicts.push({ id: b.id, name: b.name });
    const byBiz = new Map(rows.map((r) => [r.businessId, r.assignedTo]));
    if (up.length) {
      await tx.insert(leadActivity).values(
        up.map((l) => ({ leadId: l.id, userId: s.userId, action: "assigned", detail: byBiz.get(l.businessId) ?? null })),
      );
    }
    return { rows: rows.filter((r) => done.has(r.businessId)), up };
  });

  if (result.rows.length) {
    const counts = new Map<string, number>();
    for (const r of result.rows) counts.set(r.assignedTo, (counts.get(r.assignedTo) ?? 0) + 1);
    // A push failure must not turn a successful assign into a 500.
    await Promise.allSettled(
      [...counts].map(([uid, c]) =>
        notifyUser(uid, { title: "New leads", body: `${c} new lead${c === 1 ? "" : "s"} assigned to you`, url: "/rep" }),
      ),
    );
  }

  revalidateLeadsCache();
  return NextResponse.json({ assigned: result.rows.length, skippedDnc, conflicts });
}
