import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getBusinessRow } from "@/lib/rows";
import { getConfig } from "@/lib/settings";
import { generateSiteCopy } from "@/lib/llm/provider";
import { getTemplateMeta } from "@/lib/templates";
import { slugify, randomSuffix } from "@/lib/slug";
import { toWhatsappNumber, directionsLink } from "@/lib/whatsapp";
import { resolvePhotoUrl } from "@/lib/photos";
import type { BusinessRow, SiteContent, SiteHighlight, SitePhoto } from "@/lib/types";
import type { SiteRecord } from "@/lib/db/schema";

export function businessPhotosToSite(b: BusinessRow): SitePhoto[] {
  return (b.photos ?? [])
    .filter((p) => p.uri)
    .slice(0, 9)
    .map((p) => ({ url: resolvePhotoUrl(p.uri!, 1200), alt: b.name, source: "places" as const }));
}

function buildHighlights(b: BusinessRow): SiteHighlight[] {
  const out: SiteHighlight[] = [];
  if (b.rating != null && b.reviewCount > 0) {
    out.push({ value: `${b.rating.toFixed(1)}★`, label: `${b.reviewCount} Google reviews` });
  }
  const openDays = (b.hours?.weekdayDescriptions ?? []).filter(
    (d) => !/closed/i.test(d),
  ).length;
  if (openDays > 0) {
    out.push({ value: openDays === 7 ? "7 days" : `${openDays} days`, label: "Open every week" });
  }
  if (b.categoryLabel) {
    out.push({ value: b.categoryLabel, label: "What we do" });
  }
  if (b.phone) out.push({ value: "Same-day", label: "Replies to enquiries" });
  return out.slice(0, 3);
}

export async function buildInitialContent(
  b: BusinessRow,
  templateId: string,
): Promise<{ content: SiteContent; photos: SitePhoto[] }> {
  const meta = getTemplateMeta(templateId);
  const copy = await generateSiteCopy({ business: b, templateName: meta.name });

  const wa = toWhatsappNumber(b.phone);
  const content: SiteContent = {
    businessName: b.name,
    tagline: copy.tagline,
    heroHeadline: copy.heroHeadline,
    heroSub: copy.heroSub,
    ctaLabel: copy.ctaLabel,
    aboutTitle: copy.aboutTitle,
    aboutBody: copy.aboutBody,
    services: copy.services,
    highlights: buildHighlights(b),
    hoursTitle: "Opening hours",
    hours: b.hours?.weekdayDescriptions ?? [],
    address: b.address ?? "",
    phone: b.phone ?? "",
    whatsapp: wa,
    whatsappMessage: `Hi ${b.name}, I found you on Google and wanted to ask about your services.`,
    mapLink: directionsLink(b.lat, b.lng, b.address),
    footerNote: copy.footerNote,
  };

  return { content, photos: businessPhotosToSite(b) };
}

export async function createSite(
  businessId: string,
  templateId: string,
): Promise<SiteRecord> {
  const existing = await db.select().from(sites).where(eq(sites.businessId, businessId)).limit(1);
  if (existing[0]) return existing[0];

  const b = await getBusinessRow(businessId);
  if (!b) throw new Error("business not found");
  const cfg = await getConfig();
  const meta = getTemplateMeta(templateId);
  const { content, photos } = await buildInitialContent(b, meta.id);

  const slug = `${slugify(b.name)}-${randomSuffix()}`;
  const quote = Math.round((cfg.defaultQuoteMin + cfg.defaultQuoteMax) / 2);

  const inserted = await db
    .insert(sites)
    .values({
      businessId,
      slug,
      template: meta.id,
      theme: meta.defaultTheme,
      contentJson: content,
      photosJson: photos,
      quotePrice: quote,
      status: "draft",
    })
    .returning();
  return inserted[0];
}

export async function regenerateCopy(siteId: string): Promise<SiteRecord> {
  const rows = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  const site = rows[0];
  if (!site) throw new Error("site not found");
  const b = await getBusinessRow(site.businessId);
  if (!b) throw new Error("business not found");
  const meta = getTemplateMeta(site.template);
  const copy = await generateSiteCopy({ business: b, templateName: meta.name });
  const merged: SiteContent = {
    ...site.contentJson,
    tagline: copy.tagline,
    heroHeadline: copy.heroHeadline,
    heroSub: copy.heroSub,
    ctaLabel: copy.ctaLabel,
    aboutTitle: copy.aboutTitle,
    aboutBody: copy.aboutBody,
    services: copy.services,
    footerNote: copy.footerNote,
  };
  const updated = await db
    .update(sites)
    .set({ contentJson: merged, updatedAt: new Date() })
    .where(eq(sites.id, siteId))
    .returning();
  return updated[0];
}

export async function getSite(siteId: string): Promise<SiteRecord | null> {
  const rows = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  return rows[0] ?? null;
}

export async function getSiteBySlug(slug: string): Promise<SiteRecord | null> {
  const rows = await db.select().from(sites).where(eq(sites.slug, slug)).limit(1);
  return rows[0] ?? null;
}
