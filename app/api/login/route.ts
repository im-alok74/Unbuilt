import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, loginAttempts } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Valid-shaped scrypt hash nobody knows the password to; verified when the user doesn't exist so timing doesn't reveal usernames.
const DUMMY_HASH = `scrypt.${"A".repeat(22)}.${"A".repeat(43)}`;

/** Counts an attempt in a 60s window shared across serverless instances; true = over `max`. */
async function overLimit(key: string, max: number): Promise<boolean> {
  const r = await db.execute(sql`
    insert into login_attempts (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when login_attempts.window_start < now() - interval '60 seconds' then 1 else login_attempts.count + 1 end,
      window_start = case when login_attempts.window_start < now() - interval '60 seconds' then now() else login_attempts.window_start end
    returning count`);
  return Number((r.rows[0] as { count: number }).count) > max;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = (body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  // Platform-set headers (Vercel overwrites these); x-forwarded-for is client-spoofable.
  const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "?";
  const userKey = `u:${username.slice(0, 80)}`;
  if ((await overLimit(`ip:${ip}`, 30)) || (await overLimit(userKey, 5))) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let [u] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  // First run: no users yet → create the admin from env (ADMIN_PASSWORD, or the old APP_PIN). Unset ADMIN_PASSWORD after setup.
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

  const ok = verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !u.isActive || !ok) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await db.delete(loginAttempts).where(eq(loginAttempts.key, userKey));

  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set(SESSION_COOKIE, await createSessionToken({ userId: u.id, role: u.role, name: u.displayName }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
