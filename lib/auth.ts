import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

export const SESSION_COOKIE = "unbuilt_session";
const ALG = "HS256";

export interface Session {
  userId: string;
  role: Role;
  name: string;
}

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(u: Session): Promise<string> {
  return new SignJWT({ role: u.role, name: u.name })
    .setProtectedHeader({ alg: ALG })
    .setSubject(u.userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

/** Signature check only (edge-safe). Use getSession() in routes to also check the user is still active. */
export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (!payload.sub || !payload.role) return null;
    return { userId: payload.sub, role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
