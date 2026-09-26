import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE, verifySessionToken, type Session } from "@/lib/auth";
import type { Role } from "@/lib/types";

/** Token + live DB check, so deactivating a user or changing their role takes effect immediately. */
export async function getSession(): Promise<Session | null> {
  const tok = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySessionToken(tok);
  if (!s) return null;
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  if (!u || !u.isActive) return null;
  return { userId: u.id, role: u.role, name: u.displayName };
}

/** Route guard: `const s = await requireSession(["manager","admin"]); if (s instanceof NextResponse) return s;` */
export async function requireSession(roles?: Role[]): Promise<Session | NextResponse> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "locked" }, { status: 401 });
  if (roles && !roles.includes(s.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return s;
}

export const STAFF: Role[] = ["manager", "admin"];
