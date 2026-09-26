import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const p = z.object({ password: z.string().min(6).max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Password must be 6+ characters." }, { status: 400 });
  await db.update(users).set({ passwordHash: hashPassword(p.data.password) }).where(eq(users.id, s.userId));
  return NextResponse.json({ ok: true });
}
