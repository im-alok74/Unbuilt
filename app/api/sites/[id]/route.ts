import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getSite } from "@/lib/sites";
import { getTemplateMeta } from "@/lib/templates";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "not found" }, { status: 404 });
  const business = await getBusinessRow(site.businessId);
  return NextResponse.json({ site, business });
}

const serviceSchema = z.object({ title: z.string().max(120), body: z.string().max(500) });
const contentSchema = z.object({
  businessName: z.string().max(200),
  tagline: z.string().max(120),
  heroHeadline: z.string().max(200),
  heroSub: z.string().max(500),
  ctaLabel: z.string().max(60),
  aboutTitle: z.string().max(80),
  aboutBody: z.string().max(1200),
  services: z.array(serviceSchema).max(8),
  hoursTitle: z.string().max(80),
  hours: z.array(z.string().max(120)).max(14),
  address: z.string().max(400),
  phone: z.string().max(60),
  mapLink: z.string().max(500),
  footerNote: z.string().max(200),
});

const patchSchema = z.object({
  template: z.string().optional(),
  theme: z.string().optional(),
  content: contentSchema.partial().optional(),
  photos: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().max(200),
        source: z.enum(["places", "upload", "stock"]),
      }),
    )
    .max(12)
    .optional(),
  quotePrice: z.number().int().min(0).max(10_000_000).optional(),
  status: z.enum(["draft", "sent", "live"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const p = parsed.data;

  const current = await getSite(id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (p.template && p.template !== current.template) {
    // Switching template: keep the copy, adopt the new template's default theme
    // unless the caller also passed a theme.
    const meta = getTemplateMeta(p.template);
    set.template = meta.id;
    if (!p.theme) set.theme = meta.defaultTheme;
  }
  if (p.theme) set.theme = p.theme;
  if (p.content) set.contentJson = { ...current.contentJson, ...p.content };
  if (p.photos) set.photosJson = p.photos;
  if (typeof p.quotePrice === "number") set.quotePrice = p.quotePrice;
  if (p.status) {
    set.status = p.status;
    set.publishedUrl = p.status === "live" ? `/s/${current.slug}` : null;
  }

  const updated = await db.update(sites).set(set).where(eq(sites.id, id)).returning();
  const business = await getBusinessRow(current.businessId);
  return NextResponse.json({ site: updated[0], business });
}
