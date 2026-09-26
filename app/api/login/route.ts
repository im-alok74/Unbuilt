import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ponytail: per-instance counter (serverless = not shared); enough to blunt guessing for 20 users, use a DB counter if abused
const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = (body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const key = `${ip}|${username}`;
  const f = fails.get(key);
  if (f && f.n >= 5 && f.until > Date.now()) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let [u] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  // First run: no users yet → create the admin from env (ADMIN_PASSWORD, or the old APP_PIN).
  if (!u) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(users);
    const boot = process.env.ADMIN_PASSWORD?.trim() || process.env.APP_PIN?.trim();
    const bootUser = (process.env.ADMIN_USERNAME?.trim() || "admin").toLowerCase();
    if (Number(n) === 0 && boot && username === bootUser && password === boot) {
      [u] = await db
        .insert(users)
        .values({ username, displayName: "Admin", role: "admin", passwordHash: hashPassword(password) })
        .returning();
    }
  }

  if (!u || !u.isActive || !verifyPassword(password, u.passwordHash)) {
    fails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 60_000 });
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  fails.delete(key);

  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set(SESSION_COOKIE, await createSessionToken({ userId: u.id, role: u.role, name: u.displayName }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
