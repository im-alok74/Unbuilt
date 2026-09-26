import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubs } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await db
    .insert(pushSubs)
    .values({ endpoint: p.data.endpoint, userId: s.userId, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth })
    .onConflictDoUpdate({
      target: pushSubs.endpoint,
      set: { userId: s.userId, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth },
    });
  return NextResponse.json({ ok: true });
}
