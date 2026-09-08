import "server-only";
import { classifyWebsite } from "@/lib/scoring/score";
import type { NormalizedBusiness, PlacePhoto } from "@/lib/types";
import { humanizeType } from "@/lib/utils";
import type { Tile } from "./tiles";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "places.regularOpeningHours",
  "places.googleMapsUri",
].join(",");

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  businessStatus?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string; widthPx?: number; heightPx?: number }[];
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean };
  googleMapsUri?: string;
}

/** Direct Google media URL (key embedded) — server-side use only, never sent to a browser. */
export function photoUrl(name: string, apiKey: string, maxWidthPx = 800): string {
  return `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxWidthPx=${maxWidthPx}`;
}

/** Keyless proxy URL stored on the business + served to browsers. */
export function proxyPhotoUrl(name: string, w = 800): string {
  return `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;
}

function normalize(p: RawPlace, _apiKey: string): NormalizedBusiness {
  const photos: PlacePhoto[] = (p.photos ?? []).map((ph) => ({
    name: ph.name,
    widthPx: ph.widthPx,
    heightPx: ph.heightPx,
    uri: proxyPhotoUrl(ph.name, 1000),
  }));
  const websiteRaw = p.websiteUri ?? null;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "(unnamed)",
    category: p.primaryType ?? p.types?.[0] ?? null,
    categoryLabel:
      p.primaryTypeDisplayName?.text ??
      humanizeType(p.primaryType ?? p.types?.[0] ?? null),
    types: p.types ?? [],
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber ?? null,
    websiteRaw,
    websiteStatus: classifyWebsite(websiteRaw),
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount: p.userRatingCount ?? 0,
    photoCount: photos.length,
    photos,
    businessStatus: p.businessStatus ?? null,
    hours: p.regularOpeningHours
      ? {
          weekdayDescriptions: p.regularOpeningHours.weekdayDescriptions ?? [],
          openNow: p.regularOpeningHours.openNow,
        }
      : null,
    raw: p,
  };
}

async function callSearchNearby(
  tile: Tile,
  apiKey: string,
  includedTypes: string[] | undefined,
): Promise<{ ok: true; places: RawPlace[] } | { ok: false; status: number; body: string }> {
  const body: Record<string, unknown> = {
    maxResultCount: 20,
    rankPreference: "POPULARITY",
    locationRestriction: {
      circle: {
        center: { latitude: tile.lat, longitude: tile.lng },
        radius: Math.min(Math.max(tile.radius, 1), 50000),
      },
    },
  };
  if (includedTypes && includedTypes.length > 0) {
    body.includedTypes = includedTypes.slice(0, 50); // API allows up to 50
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text().catch(() => "") };
  }
  const json = (await res.json()) as { places?: RawPlace[] };
  return { ok: true, places: json.places ?? [] };
}

export async function searchTile(
  tile: Tile,
  apiKey: string,
  includedTypes?: string[],
): Promise<NormalizedBusiness[]> {
  let types = includedTypes;
  let res = await callSearchNearby(tile, apiKey, types);

  // Google rejects the whole request if any includedType isn't a valid Nearby
  // Search type (e.g. "general_contractor"). Strip the offenders and retry.
  if (
    !res.ok &&
    res.status === 400 &&
    /Unsupported types?:/i.test(res.body) &&
    types &&
    types.length
  ) {
    const bad = new Set(
      (res.body.match(/Unsupported types?:\s*([^"}\n]+)/i)?.[1] ?? "")
        .split(",")
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter(Boolean),
    );
    types = types.filter((t) => !bad.has(t));
    res = await callSearchNearby(tile, apiKey, types.length ? types : undefined);
  }

  if (!res.ok) {
    throw new Error(`Places searchNearby ${res.status}: ${res.body.slice(0, 300)}`);
  }
  return res.places.map((p) => normalize(p, apiKey));
}
