import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { and, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { deriveArea } from "@/lib/area";
import { revalidateLeadsCache, LEADS_LIST_TAG } from "@/lib/cache";

export const dynamic = "force-dynamic";

const areaCounts = unstable_cache(
  async () => {
    const rows = await db
      .select({ area: businesses.area, count: sql<number>`count(*)`.mapWith(Number) })
      .from(businesses)
      .groupBy(businesses.area)
      .orderBy(sql`count(*) desc`);
    return rows.filter((r) => r.area);
  },
  ["areas-counts"],
  { tags: [LEADS_LIST_TAG], revalidate: 120 },
);

/** Areas with lead counts, for the Leads filter. */
export async function GET() {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;

  // ponytail: leads saved before the area column existed get filled on first load (500 per batched UPDATE);
  // drop this block once every row has an area.
  const missing = and(isNull(businesses.area), isNotNull(businesses.address));
  let changed = false;
  const any = await db.select({ one: sql<number>`1` }).from(businesses).where(missing).limit(1);
  if (any.length) {
    for (let i = 0; i < 4; i++) {
      const old = await db.select({ id: businesses.id, address: businesses.address }).from(businesses).where(missing).limit(500);
      const found = old.map((b) => ({ id: b.id, area: deriveArea(b.address) })).filter((b) => b.area);
      if (!found.length) break; // nothing derivable; avoid looping on the same rows
      const vals = sql.join(found.map((b) => sql`(${b.id}::uuid, ${b.area})`), sql`, `);
      await db.execute(sql`update businesses b set area = v.a from (values ${vals}) as v(id, a) where b.id = v.id`);
      changed = true;
      if (old.length < 500) break;
    }
  }
  if (changed) revalidateLeadsCache();

  return NextResponse.json({ areas: await areaCounts() });
}
