import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dnc } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { normPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  return NextResponse.json({ dnc: await db.select().from(dnc).orderBy(desc(dnc.createdAt)).limit(500) });
}

export async function POST(req: NextRequest) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const p = z.object({ phone: z.string().min(10), reason: z.string().max(200).optional() }).safeParse(await req.json().catch(() => null));
  const phone = p.success ? normPhone(p.data.phone) : "";
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  await db.insert(dnc).values({ phone, reason: p.success ? p.data.reason : null, addedBy: s.userId }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const phone = req.nextUrl.searchParams.get("phone") ?? "";
  await db.delete(dnc).where(eq(dnc.phone, phone));
  return NextResponse.json({ ok: true });
}
