import { NextRequest } from "next/server";
import { getConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";
// 30 days — inside Google's cache limit for Places content.
const MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Photo proxy. Published client sites call /api/photo?name=places/…/photos/…&w=800
 * instead of hitting Google directly, so the API key never appears in public HTML
 * and Vercel's CDN caches every photo after the first fetch.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const name = p.get("name");
  const w = Math.min(Math.max(Number(p.get("w") ?? "800"), 100), 1600);

  if (!name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return new Response("bad name", { status: 400 });
  }

  const cfg = await getConfig();
  if (!cfg.placesApiKey) {
    return Response.redirect(placeholder(w), 302);
  }

  const url = `https://places.googleapis.com/v1/${name}/media?key=${cfg.placesApiKey}&maxWidthPx=${w}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok || !res.body) {
      return Response.redirect(placeholder(w), 302);
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": `public, max-age=${MAX_AGE}, s-maxage=${MAX_AGE}, immutable`,
      },
    });
  } catch {
    return Response.redirect(placeholder(w), 302);
  }
}

function placeholder(w: number) {
  return `https://placehold.co/${w}x${Math.round(w * 0.66)}/eef0ee/9aa0a6?text=photo`;
}
