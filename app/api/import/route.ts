import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, dnc } from "@/lib/db/schema";
import { requireSession, STAFF } from "@/lib/session";
import { normPhone, normPhoneSql } from "@/lib/phone";
import { classifyWebsite, scoreBusiness } from "@/lib/scoring/score";
import { getConfig } from "@/lib/settings";
import { revalidateLeadsCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

const rowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional(),
  category: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
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

  // Dedupe against the DB and within the file, by phone (the only reliable key for hand-made lists).
  const phones = [...new Set(p.data.rows.map((r) => normPhone(r.phone)).filter(Boolean))];
  const existing = new Set<string>();
  for (let i = 0; i < phones.length; i += 500) {
    const chunk = phones.slice(i, i + 500);
    const found = await db
      .select({ phone: normPhoneSql(businesses.phone) })
      .from(businesses)
      .where(inArray(normPhoneSql(businesses.phone), chunk));
    found.forEach((f) => existing.add(f.phone));
  }

  const seen = new Set<string>();
  const toInsert: (typeof businesses.$inferInsert)[] = [];
  const notes: string[] = [];
  const skipped = { duplicate: 0, dnc: 0, noPhone: 0 };
  for (const r of p.data.rows) {
    const ph = normPhone(r.phone);
    if (ph && dncSet.has(ph)) { skipped.dnc++; continue; }
    if (ph && (existing.has(ph) || seen.has(ph))) { skipped.duplicate++; continue; }
    if (!ph) skipped.noPhone++; // still imported — reps can find a number — but flagged
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
      phone: r.phone ?? null,
      websiteRaw: r.website || null,
      websiteStatus,
      score,
      scoreBreakdown: factors,
    });
  }

  const ids: string[] = [];
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const rows = await db.insert(businesses).values(chunk).returning({ id: businesses.id });
    ids.push(...rows.map((r) => r.id));
    // Spreadsheet notes become the lead's starting note so reps see them.
    await db
      .insert(leads)
      .values(
        rows.map((row, j) => ({
          businessId: row.id,
          notes: notes[i + j],
        })),
      )
      .onConflictDoNothing();
  }

  revalidateLeadsCache();
  return NextResponse.json({ imported: ids.length, businessIds: ids, skipped });
}
