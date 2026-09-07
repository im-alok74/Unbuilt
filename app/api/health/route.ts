import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = { ok: true, ts: new Date().toISOString() };
  try {
    await db.execute(sql`select 1`);
    out.db = "up";
  } catch (e) {
    out.db = "down";
    out.dbError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
