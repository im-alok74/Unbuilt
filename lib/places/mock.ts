import { classifyWebsite } from "@/lib/scoring/score";
import type { NormalizedBusiness } from "@/lib/types";
import { humanizeType } from "@/lib/utils";

// Deterministic PRNG so re-scanning the same spot returns a stable set.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(lat: number, lng: number): number {
  const s = Math.round(lat * 1e4) * 73856093 + Math.round(lng * 1e4) * 19349663;
  return s >>> 0;
}

const CATALOG: { type: string; names: string[]; websiteOdds: number }[] = [
  {
    type: "restaurant",
    websiteOdds: 0.35,
    names: [
      "Spice Route Kitchen", "The Copper Pot", "Tandoori Junction", "Green Chilli",
      "Curry Leaf Cafe", "Biryani House", "Urban Tadka", "Masala Story",
      "The Hungry Bowl", "Anna's Dosa Corner",
    ],
  },
  {
    type: "cafe",
    websiteOdds: 0.4,
    names: [
      "Brew & Bloom", "The Daily Grind", "Cafe Mocha", "Bean There",
      "Sunrise Coffee Co", "Chai Point Adda", "Filter & Froth",
    ],
  },
  {
    type: "hair_salon",
    websiteOdds: 0.15,
    names: [
      "Scissors & Style", "The Cut Above", "Glow Salon", "Mirror Mirror Studio",
      "Kaya Beauty Lounge", "Snip City", "Blush Hair Bar",
    ],
  },
  {
    type: "beauty_salon",
    websiteOdds: 0.15,
    names: [
      "Radiance Skin & Spa", "Velvet Touch", "Lotus Beauty Studio", "Bare Essentials",
      "Serene Wellness", "The Glow Room",
    ],
  },
  {
    type: "gym",
    websiteOdds: 0.3,
    names: [
      "Iron Temple Fitness", "PowerHouse Gym", "FlexZone", "CrossFit Sector 7",
      "The Grind Fitness Club", "Anytime Muscle",
    ],
  },
  {
    type: "general_contractor",
    websiteOdds: 0.2,
    names: [
      "Sharma Builders & Interiors", "Apex Construction Co", "BuildRight Contractors",
      "Cornerstone Renovations", "Skyline Interiors",
    ],
  },
  {
    type: "plumber",
    websiteOdds: 0.1,
    names: ["QuickFix Plumbing", "PipeWorks", "AquaFlow Services", "DrainMaster"],
  },
  {
    type: "electrician",
    websiteOdds: 0.1,
    names: ["Volt Electricals", "BrightSpark Services", "PowerLine Electric"],
  },
  {
    type: "dentist",
    websiteOdds: 0.45,
    names: [
      "SmileCare Dental", "32 Pearls Clinic", "Dr. Rao's Dental Studio",
      "Bright Smile Dentistry", "Perfect Bite Dental",
    ],
  },
  {
    type: "doctor",
    websiteOdds: 0.35,
    names: [
      "City Family Clinic", "Wellness Point Medical", "CarePlus Polyclinic",
      "Dr. Menon's Practice",
    ],
  },
  {
    type: "bakery",
    websiteOdds: 0.25,
    names: ["Warm Oven Bakehouse", "Crust & Crumb", "Sugar & Spice Bakery", "The Bread Basket"],
  },
  {
    type: "car_repair",
    websiteOdds: 0.1,
    names: ["Gear Up Garage", "AutoMend Workshop", "Pit Stop Motors"],
  },
  {
    type: "clothing_store",
    websiteOdds: 0.3,
    names: ["Thread & Needle", "The Wardrobe", "Fabindia Corner", "Denim District"],
  },
];

const SOCIAL_SAMPLES = [
  "https://www.facebook.com/",
  "https://www.instagram.com/",
  "https://linktr.ee/",
  "https://sites.google.com/view/",
];

export function mockSearch(
  center: { lat: number; lng: number },
  radiusM: number,
  includedTypes?: string[],
): NormalizedBusiness[] {
  const rand = mulberry32(seedFrom(center.lat, center.lng));
  const count = 14 + Math.floor(rand() * 22); // 14–35 businesses
  const out: NormalizedBusiness[] = [];
  const typeFilter = includedTypes && includedTypes.length ? new Set(includedTypes) : null;

  for (let i = 0; i < count; i++) {
    let entry = CATALOG[Math.floor(rand() * CATALOG.length)];
    if (typeFilter) {
      const allowed = CATALOG.filter((c) => typeFilter.has(c.type));
      if (allowed.length === 0) break;
      entry = allowed[Math.floor(rand() * allowed.length)];
    }
    const name = entry.names[Math.floor(rand() * entry.names.length)] + suffix(rand, i);

    // Scatter within the radius.
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * radiusM;
    const latPerM = 1 / 111_320;
    const lngPerM = 1 / (111_320 * Math.cos((center.lat * Math.PI) / 180));
    const lat = center.lat + Math.sin(angle) * dist * latPerM;
    const lng = center.lng + Math.cos(angle) * dist * lngPerM;

    const roll = rand();
    let websiteRaw: string | null = null;
    if (roll < entry.websiteOdds) {
      websiteRaw = `https://${slug(name)}.com`;
    } else if (roll < entry.websiteOdds + 0.28) {
      websiteRaw =
        SOCIAL_SAMPLES[Math.floor(rand() * SOCIAL_SAMPLES.length)] + slug(name);
    }

    const photoCount = Math.floor(rand() * 12);
    const rating = Math.round((3.4 + rand() * 1.6) * 10) / 10;
    const reviewCount = Math.floor(rand() ** 2 * 220);
    const photos = Array.from({ length: Math.min(photoCount, 6) }, (_, k) => ({
      name: `mock/${slug(name)}/${k}`,
      uri: `https://picsum.photos/seed/${slug(name)}-${k}/1200/800`,
      widthPx: 1200,
      heightPx: 800,
    }));

    out.push({
      placeId: `mock_${seedFrom(center.lat, center.lng)}_${i}`,
      name,
      category: entry.type,
      categoryLabel: humanizeType(entry.type),
      types: [entry.type, "point_of_interest", "establishment"],
      address: `${100 + Math.floor(rand() * 800)} ${streetName(rand)}, Sector ${1 + Math.floor(rand() * 40)}`,
      lat,
      lng,
      phone: `+91 ${90000 + Math.floor(rand() * 9999)} ${10000 + Math.floor(rand() * 89999)}`,
      websiteRaw,
      websiteStatus: classifyWebsite(websiteRaw),
      rating,
      reviewCount,
      photoCount,
      photos,
      businessStatus: "OPERATIONAL",
      hours: {
        weekdayDescriptions: [
          "Monday: 9:00 AM – 8:00 PM",
          "Tuesday: 9:00 AM – 8:00 PM",
          "Wednesday: 9:00 AM – 8:00 PM",
          "Thursday: 9:00 AM – 8:00 PM",
          "Friday: 9:00 AM – 9:00 PM",
          "Saturday: 10:00 AM – 9:00 PM",
          "Sunday: Closed",
        ],
        openNow: rand() > 0.4,
      },
      raw: { mock: true },
    });
  }

  // De-dupe by name.
  const seen = new Set<string>();
  return out.filter((b) => {
    if (seen.has(b.name)) return false;
    seen.add(b.name);
    return true;
  });
}

function suffix(rand: () => number, i: number): string {
  const opts = ["", "", "", " — Downtown", " (Main Rd)", " 2", " Express"];
  return opts[Math.floor(rand() * opts.length)] + (i > 20 ? ` #${i}` : "");
}
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function streetName(rand: () => number): string {
  const s = ["MG Road", "Park Street", "Church Lane", "Ring Road", "Market Ave", "Station Road", "Hill View"];
  return s[Math.floor(rand() * s.length)];
}
