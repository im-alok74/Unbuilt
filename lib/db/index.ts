import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in the Vercel project's Environment Variables (or .env.local for local dev).",
    );
  }
  // Supabase's Supavisor pooler (transaction mode, port 6543) doesn't support
  // prepared statements, and `max: 1` keeps each serverless invocation to a
  // single pooled connection instead of opening its own mini-pool. `ssl:
  // "verify-full"` (not "require", which postgres-js maps to
  // `rejectUnauthorized: false` — encrypted but MITM-able) validates the
  // pooler's certificate against Node's trusted CA store and its hostname.
  const client = postgres(url, { prepare: false, max: 1, ssl: "verify-full" });
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Lazily-initialised Drizzle client. The connection is only created on first
 * query, so `next build` succeeds even when DATABASE_URL is absent at build time.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
