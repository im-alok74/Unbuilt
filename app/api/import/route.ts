import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, dnc } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { deriveArea, normPhone } from "@/lib/area";
import { ensurePhoneKeys } from "@/lib/phonekeys";
import { classifyWebsite, scoreBusiness } from "@/lib/scoring/score";
import { getConfig } from "@/lib/settings";
import { revalidateLeadsCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional(),
  category: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  area: z.string().trim().max(80).optional(),
  website: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const schema = z.object({ rows: z.array(rowSchema).min(1).max(2000) });

/**
 * Bulk-add leads from a spreadsheet the browser already parsed. Also serves the
 * single "add lead manually" form (rows of length 1). No Places calls.
 */
export async function POST(req: NextRequest) {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid rows" }, { status: 400 });
  }

  const cfg = await getConfig();
  const dncSet = new Set((await db.select({ phone: dnc.phone }).from(dnc)).map((d) => d.phone));

  // A cell like "98765 43210 / 98765 00000" or "a, b" holds several numbers: keep the first.
  const rows = p.data.rows.map((r) => ({ ...r, phone: r.phone?.split(/[/,;|\n]|\sor\s/i)[0]?.trim() || undefined }));

  // Dedupe against the DB and within the file, by phone; rows without one fall back to name + area.
  await ensurePhoneKeys();
  const keyOf = (r: { phone?: string; area?: string; address?: string }) => normPhone(r.phone, `${r.area ?? ""} ${r.address ?? ""}`);
  const nameKeyOf = (r: { name: string; area?: string; address?: string }) =>
    `${r.name.toLowerCase()}|${(r.area || deriveArea(r.address) || "").toLowerCase()}`;
  const phones = [...new Set(rows.map(keyOf).filter(Boolean))];
  const nameKeys = [...new Set(rows.filter((r) => !keyOf(r)).map(nameKeyOf))];
  const existing = new Set<string>();
  for (let i = 0; i < phones.length; i += 500) {
    const chunk = phones.slice(i, i + 500);
    const found = await db
      .select({ phone: businesses.phoneKey })
      .from(businesses)
      .where(inArray(businesses.phoneKey, chunk));
    found.forEach((f) => f.phone && existing.add(f.phone));
  }

  const existingNames = new Set<string>();
  const nameExpr = sql<string>`lower(${businesses.name}) || '|' || lower(coalesce(${businesses.area}, ''))`;
  for (let i = 0; i < nameKeys.length; i += 500) {
    const found = await db
      .select({ k: nameExpr })
      .from(businesses)
      .where(and(isNull(businesses.phoneKey), inArray(nameExpr, nameKeys.slice(i, i + 500))));
    found.forEach((f) => existingNames.add(f.k));
  }

  const seen = new Set<string>();
  const toInsert: (typeof businesses.$inferInsert)[] = [];
  const notes: string[] = [];
  const skipped = { duplicate: 0, dnc: 0, noPhone: 0 };
  for (const r of rows) {
    const ph = keyOf(r);
    if (ph && dncSet.has(ph)) { skipped.dnc++; continue; }
    if (ph && (existing.has(ph) || seen.has(ph))) { skipped.duplicate++; continue; }
    if (!ph) {
      const nk = nameKeyOf(r);
      if (existingNames.has(nk) || seen.has(nk)) { skipped.duplicate++; continue; }
      seen.add(nk);
      skipped.noPhone++; // still imported — reps can find a number — but flagged
    }
    if (ph) seen.add(ph);
    const websiteStatus = classifyWebsite(r.website);
    const { score, factors } = scoreBusiness(
      { websiteStatus, photoCount: 0, reviewCount: 0, rating: null, types: r.category ? [r.category.toLowerCase().replace(/\s+/g, "_")] : [] },
      cfg.scoringWeights,
      cfg.priorityCategories,
    );
    notes.push(r.notes ?? "");
    toInsert.push({
      placeId: `import:${randomUUID()}`,
      name: r.name,
      category: r.category ? r.category.toLowerCase().replace(/\s+/g, "_") : null,
      categoryLabel: r.category ?? null,
      address: r.address ?? null,
      area: r.area || deriveArea(r.address),
      phone: r.phone ?? null,
      phoneKey: ph,
      websiteRaw: r.website || null,
      websiteStatus,
      score,
      scoreBreakdown: factors,
    });
  }

  const ids: string[] = [];
  let failed: unknown = null;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    try {
      // Businesses and their leads land together, so a failure can't orphan businesses.
      const got = await db.transaction(async (tx) => {
        const ins = await tx.insert(businesses).values(chunk).returning({ id: businesses.id });
        // Spreadsheet notes become the lead's starting note so reps see them.
        await tx
          .insert(leads)
          .values(ins.map((row, j) => ({ businessId: row.id, notes: notes[i + j] })))
          .onConflictDoNothing();
        return ins;
      });
      ids.push(...got.map((r) => r.id));
    } catch (e) {
      failed = e;
      break;
    }
  }

  if (ids.length) revalidateLeadsCache();
  if (failed) {
    console.error("import chunk failed", failed);
    return NextResponse.json(
      { error: `Import stopped part-way: ${ids.length} of ${toInsert.length} rows imported before an error. Fix the file and re-import the rest (already-imported rows are skipped as duplicates).`, imported: ids.length, businessIds: ids, skipped },
      { status: 500 },
    );
  }
  return NextResponse.json({ imported: ids.length, businessIds: ids, skipped });
}
