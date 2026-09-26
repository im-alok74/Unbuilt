import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/crypto";
import { requireSession, STAFF } from "@/lib/session";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  password: z.string().min(6).max(200).optional(),
  isActive: z.boolean().optional(),
  dailyTarget: z.number().int().min(1).max(200).optional(),
  commissionPct: z.number().int().min(10).max(20).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const p = patchSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Managers manage reps only; nobody can lock themselves out.
  if (s.role !== "admin" && target.role !== "rep") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (p.data.isActive === false && id === s.userId) {
    return NextResponse.json({ error: "You can't deactivate yourself." }, { status: 400 });
  }
  if (p.data.commissionPct !== undefined && s.role !== "admin") {
    return NextResponse.json({ error: "Only the admin sets commission." }, { status: 403 });
  }

  const { password, ...rest } = p.data;
  await db
    .update(users)
    .set({ ...rest, ...(password ? { passwordHash: hashPassword(password) } : {}) })
    .where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
