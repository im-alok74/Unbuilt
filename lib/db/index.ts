import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in the Vercel project's Environment Variables (or .env.local for local dev).",
    );
  }
  // One connection per serverless instance: Supabase's transaction pooler (port 6543) multiplexes them.
  // node-postgres uses unnamed statements, which is what transaction-mode poolers require.
  // sslmode/channel_binding in the URL would override the ssl option below, so drop them.
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("channel_binding");
  const pool = new Pool({
    connectionString: u.toString(),
    max: 1,
    idleTimeoutMillis: 10_000,
    // Certificate verification stays on. If the provider's CA isn't publicly trusted (Supabase), set DATABASE_CA to its PEM.
    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA } : true,
  });
  _db = drizzle(pool, { schema });
  return _db;
}

/**
 * Lazily-initialised Drizzle client. The connection is only created on first
 * query, so `next build` succeeds even when DATABASE_URL is absent at build time.
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
