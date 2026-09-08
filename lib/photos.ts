/**
 * Normalise any stored photo URL to something safe to render in a browser.
 * Rewrites legacy direct Google media URLs (which leaked the API key) to the
 * keyless /api/photo proxy. Everything else passes through unchanged.
 */
export function resolvePhotoUrl(url: string | null | undefined, w = 800): string {
  if (!url) return "";
  try {
    if (url.includes("places.googleapis.com") && url.includes("/media")) {
      const u = new URL(url);
      // pathname is /v1/places/<id>/photos/<ref>/media
      const m = u.pathname.match(/\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media/);
      if (m) return `/api/photo?name=${encodeURIComponent(m[1])}&w=${w}`;
    }
  } catch {
    /* not a URL — fall through */
  }
  return url;
}
