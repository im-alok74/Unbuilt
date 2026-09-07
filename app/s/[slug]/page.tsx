import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteBySlug } from "@/lib/sites";
import { SiteTemplate } from "@/components/build/SiteTemplate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug).catch(() => null);
  if (!site || site.status !== "live") return { title: "Not found" };
  return {
    title: site.contentJson.businessName,
    description: site.contentJson.heroSub,
    robots: { index: false, follow: false },
  };
}

export default async function PublicSite({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug).catch(() => null);
  if (!site || site.status !== "live") notFound();

  return (
    <main className="min-h-[100dvh] bg-white">
      <SiteTemplate
        templateId={site.template}
        theme={site.theme}
        content={site.contentJson}
        photos={site.photosJson}
      />
    </main>
  );
}
