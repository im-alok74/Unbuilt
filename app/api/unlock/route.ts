import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getSettingsRow } from "@/lib/settings";
import { hashPin, verifyPin } from "@/lib/crypto";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

function setSession(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function GET() {
  // Tells the /unlock screen whether to show "enter PIN" or "set a PIN".
  const row = await getSettingsRow();
  const configured = Boolean(row.pinHash) || Boolean(process.env.APP_PIN);
  return NextResponse.json({ configured });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    pin?: string;
    newPin?: string;
  };
  const row = await getSettingsRow();
  const hasPin = Boolean(row.pinHash);
  const envPin = process.env.APP_PIN?.trim();

  // ── First-run: set a PIN ────────────────────────────────────────────────────
  if (!hasPin && !envPin) {
    const newPin = (body.newPin ?? "").trim();
    if (!/^\d{4,8}$/.test(newPin)) {
      return NextResponse.json(
        { error: "PIN must be 4–8 digits." },
        { status: 400 },
      );
    }
    await db
      .update(settings)
      .set({ pinHash: hashPin(newPin), updatedAt: new Date() })
      .where(eq(settings.id, 1));
    const res = NextResponse.json({ ok: true, set: true });
    setSession(res, await createSessionToken());
    return res;
  }

  // ── Normal: verify PIN ──────────────────────────────────────────────────────
  // Once a real PIN is set in the DB, the APP_PIN env var stops working as a
  // fallback (it is only a first-run bootstrap).
  const pin = (body.pin ?? "").trim();
  const ok = row.pinHash
    ? verifyPin(pin, row.pinHash)
    : Boolean(envPin) && pin === envPin;

  if (!ok) {
    return NextResponse.json({ error: "Wrong PIN." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setSession(res, await createSessionToken());
  return res;
}
