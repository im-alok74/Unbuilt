import type {
  NormalizedBusiness,
  ScoreFactor,
  ScoreResult,
  ScoringWeights,
  WebsiteStatus,
} from "../types";

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linktr.ee",
  "wixsite.com",
  "business.site", // Google's free "website" builder
  "sites.google.com",
  "wa.me",
  "linktree.com",
  "beacons.ai",
  "carrd.co",
  "godaddysites.com",
  "blogspot.com",
  "tumblr.com",
  "yelp.com",
  "justdial.com",
  "zomato.com",
  "swiggy.com",
  // Indian ordering / storefront builders — not a real website
  "dotpe.in",
  "petpooja.com",
  "mydukaan.io",
  "instamojo.com",
  "myinstamojo.com",
  "pages.razorpay.com",
  "bit.ly",
  "linktw.in",
];

/**
 * Classify a raw website value from Places into:
 *  - "none"   : missing / blank
 *  - "social" : a social profile or free page builder, not a real site
 *  - "real"   : a genuine standalone domain
 */
export function classifyWebsite(raw: string | null | undefined): WebsiteStatus {
  if (!raw || !raw.trim()) return "none";
  let host: string;
  try {
    host = new URL(raw.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // Not a parseable URL — treat as social/placeholder rather than a real site.
    return "social";
  }
  if (!host) return "none";
  if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith("." + s))) {
    return "social";
  }
  return "real";
}

export interface ScoreInput {
  websiteStatus: WebsiteStatus;
  photoCount: number;
  reviewCount: number;
  rating: number | null;
  types: string[];
}

/**
 * Opportunity score, 0–100. Deterministic and pure.
 *
 *  - No website .................................. + noWebsite        (50)
 *  - Website is social/placeholder only .......... + socialOnly       (20)
 *  - Fewer than 5 photos ......................... + fewPhotos        (10)
 *  - < 20 reviews AND rating >= 4.0 .............. + underMarketed    (10)
 *  - Category in the priority list .............. + priorityCategory (10)
 *
 * Capped at 100. With default weights the practical max is 80 because
 * "no website" and "social only" are mutually exclusive.
 */
export function scoreBusiness(
  input: ScoreInput,
  weights: ScoringWeights,
  priorityCategories: string[],
): ScoreResult {
  const factors: ScoreFactor[] = [];
  const prioritySet = new Set(priorityCategories.map((c) => c.toLowerCase()));

  if (input.websiteStatus === "none") {
    factors.push({
      key: "noWebsite",
      label: "No website listed",
      points: weights.noWebsite,
      detail: "Google has no website on file for this business.",
    });
  } else if (input.websiteStatus === "social") {
    factors.push({
      key: "socialOnly",
      label: "Social / placeholder link only",
      points: weights.socialOnly,
      detail:
        "The listed 'website' is a Facebook/Instagram page or a free page builder, not a real site.",
    });
  }

  if (input.photoCount < 5) {
    factors.push({
      key: "fewPhotos",
      label: "Fewer than 5 photos",
      points: weights.fewPhotos,
      detail: `Listing has ${input.photoCount} photo${input.photoCount === 1 ? "" : "s"}.`,
    });
  }

  if (input.reviewCount < 20 && (input.rating ?? 0) >= 4.0) {
    factors.push({
      key: "underMarketed",
      label: "Active but under-marketed",
      points: weights.underMarketed,
      detail: `${input.rating?.toFixed(1)}★ from only ${input.reviewCount} reviews — good reputation, low visibility.`,
    });
  }

  const matched = input.types.map((t) => t.toLowerCase()).find((t) => prioritySet.has(t));
  if (matched) {
    factors.push({
      key: "priorityCategory",
      label: "Priority category",
      points: weights.priorityCategory,
      detail: `Matches your priority list (${matched}).`,
    });
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, factors };
}

/** Convenience wrapper for a fully normalized business. */
export function scoreNormalized(
  b: NormalizedBusiness,
  weights: ScoringWeights,
  priorityCategories: string[],
): ScoreResult {
  return scoreBusiness(
    {
      websiteStatus: b.websiteStatus,
      photoCount: b.photoCount,
      reviewCount: b.reviewCount,
      rating: b.rating,
      types: b.types,
    },
    weights,
    priorityCategories,
  );
}

/** Pin colour bucket for the map. */
export function pinBucket(
  score: number,
  leadStatus: string,
  siteStatus: string | null,
): "green" | "amber" | "pink" {
  if (leadStatus === "won" || siteStatus === "live") return "green";
  if (score >= 70) return "pink";
  if (score >= 40) return "amber";
  return "green";
}
