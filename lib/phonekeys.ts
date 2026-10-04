import "server-only";
import { isNull, isNotNull, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { normPhone } from "@/lib/area";

/** Fill businesses.phone_key for rows saved before it existed ("" = no usable number). No-op once done. */
export async function ensurePhoneKeys() {
  for (let i = 0; i < 20; i++) {
    const rows = await db
      .select({ id: businesses.id, phone: businesses.phone, area: businesses.area, address: businesses.address })
      .from(businesses)
      .where(and(isNull(businesses.phoneKey), isNotNull(businesses.phone)))
      .limit(500);
    if (!rows.length) return;
    const vals = sql.join(rows.map((r) => sql`(${r.id}::uuid, ${normPhone(r.phone, `${r.area ?? ""} ${r.address ?? ""}`)})`), sql`, `);
    await db.execute(sql`update businesses b set phone_key = v.k from (values ${vals}) as v(id, k) where b.id = v.id`);
  }
}
