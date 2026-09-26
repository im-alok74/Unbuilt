import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/crypto";
import { requireSession, STAFF } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Team list with workload numbers. Managers see reps; admins see everyone. */
export async function GET() {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const rows = await db.execute(sql`
    select u.id, u.username, u.display_name as "displayName", u.role, u.phone,
           u.commission_pct as "commissionPct", u.daily_target as "dailyTarget", u.is_active as "isActive",
           coalesce((select count(*) from leads l where l.assigned_to = u.id), 0)::int as assigned,
           coalesce((select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won'), 0)::int as won,
           coalesce((select count(*) from lead_activity a where a.user_id = u.id
                     and a.action in ('called','whatsapped') and a.created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'), 0)::int as "contactsToday"
    from users u
    ${s.role === "admin" ? sql`` : sql`where u.role = 'rep'`}
    order by u.is_active desc, u.role, u.display_name`);
  return NextResponse.json({ users: rows.rows });
}

const createSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "3–30 letters/numbers"),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(6).max(200),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(["manager", "rep"]).default("rep"),
  commissionPct: z.number().int().min(10).max(20).optional(),
  dailyTarget: z.number().int().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const p = createSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = p.data;
  if (d.role === "manager" && s.role !== "admin") {
    return NextResponse.json({ error: "Only the admin can add managers." }, { status: 403 });
  }
  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.username, d.username)).limit(1);
  if (dup) return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  const [u] = await db
    .insert(users)
    .values({
      username: d.username,
      displayName: d.displayName,
      passwordHash: hashPassword(d.password),
      phone: d.phone || null,
      role: d.role,
      // Only the admin sets commission; managers' reps start at the 10% floor.
      commissionPct: s.role === "admin" ? (d.commissionPct ?? 10) : 10,
      dailyTarget: d.dailyTarget ?? 15,
    })
    .returning({ id: users.id });
  return NextResponse.json({ id: u.id }, { status: 201 });
}
