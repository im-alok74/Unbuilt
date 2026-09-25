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
  // single pooled connection instead of opening its own mini-pool.
  //
  // TLS: `ssl: "require"` (postgres-js's default when a URL's sslmode isn't
  // set) encrypts the connection but sets `rejectUnauthorized: false`, so it
  // doesn't verify the pooler's identity — a network-positioned attacker
  // could in principle impersonate it. Full verification needs Supabase's
  // pooler CA (Project Settings → Database → SSL Configuration in the
  // Supabase dashboard, not obtainable via API); set DATABASE_CA_CERT to its
  // PEM contents to enable it. Until that's set, this falls back to
  // encrypted-but-unverified rather than refusing to start.
  const caCert = process.env.DATABASE_CA_CERT;
  const ssl = caCert ? { ca: caCert, rejectUnauthorized: true } : ("require" as const);
  const client = postgres(url, { prepare: false, max: 1, ssl });
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
