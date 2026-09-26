import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  return NextResponse.json({
    id: u.id,
    name: u.displayName,
    username: u.username,
    role: u.role,
    phone: u.phone,
    commissionPct: u.commissionPct,
    dailyTarget: u.dailyTarget,
  }, { headers: { "Cache-Control": "no-store" } });
}
