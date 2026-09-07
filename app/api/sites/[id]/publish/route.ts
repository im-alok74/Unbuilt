import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getSite } from "@/lib/sites";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";

/**
 * "Publish" for path-based hosting: flip status to `live` and expose the public
 * route /s/<slug>. No per-site Vercel deploy — the published site is served by
 * this same app and is readable without the PIN gate.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await db
    .update(sites)
    .set({
      status: "live",
      publishedUrl: `/s/${site.slug}`,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, id))
    .returning();

  const business = await getBusinessRow(site.businessId);
  return NextResponse.json({
    site: updated[0],
    business,
    url: `/s/${site.slug}`,
  });
}
