import { AGENCY, MIN_PRICE } from "@/lib/packages";
import { NICHES } from "@/lib/niches";
import { countryCodeFor } from "@/lib/area";

interface PitchNiche {
  /** Plural noun used in "For {plural} we build…". */
  plural: string;
  features: string[];
}

// What we pitch to each kind of business. Add a niche here (and its Google types in NICHE_ALIASES) to extend.
const PITCH: Record<string, PitchNiche> = {
  gym: {
    plural: "gyms",
    features: ["Membership plans & prices on one page", "Trainer profiles and class timetable", "Free-trial / join-now button on WhatsApp", "Transformation photos & reviews"],
  },
  cafe: {
    plural: "cafes",
    features: ["Mobile-friendly menu with photos", "Table booking / order on WhatsApp", "Google Maps, timings and photo gallery", "Show your 5-star reviews"],
  },
  restaurant: {
    plural: "restaurants",
    features: ["Online menu with dish photos", "Table reservation & WhatsApp ordering", "Google Maps, timings and gallery", "Reviews & special-offer banner"],
  },
  hotel: {
    plural: "hotels",
    features: ["Room gallery, rates & amenities", "Direct booking enquiries (no commission)", "Google Maps and nearby attractions", "Guest reviews"],
  },
  school: {
    plural: "schools",
    features: ["Admission enquiry form", "Facilities, faculty and results pages", "Events & notice board", "Contact and Google Maps"],
  },
  studio: {
    plural: "studios",
    features: ["Class / session schedule", "Portfolio gallery", "Booking button on WhatsApp", "Instructor profiles"],
  },
  ngo: {
    plural: "NGOs",
    features: ["Your cause and impact stories", "Donate / volunteer buttons", "Photo & event gallery", "Contact and Google Maps"],
  },
  salon: {
    plural: "salons",
    features: ["Services & price list", "Before/after gallery", "Appointment booking on WhatsApp", "Google Maps and timings"],
  },
  clinic: {
    plural: "clinics",
    features: ["Doctors & services pages", "Appointment request form", "Clinic timings and Google Maps", "Patient reviews"],
  },
  generic: {
    plural: "local businesses",
    features: ["Your services, prices and photos", "Contact form and WhatsApp button", "Google Maps and timings", "Shows up when customers search on Google"],
  },
};

// Google Places types that aren't in NICHES.
const NICHE_ALIASES: Record<string, string[]> = {
  salon: ["beauty_salon", "hair_care", "hair_salon", "spa", "barber_shop"],
  clinic: ["doctor", "dentist", "hospital", "physiotherapist", "health"],
};

/** Which pitch fits this business, from its Google category/types/name. */
export function pitchNicheId(b: { category?: string | null; types?: string[]; name?: string }): string {
  const has = [b.category, ...(b.types ?? [])].filter(Boolean) as string[];
  const text = `${b.name ?? ""} ${b.category ?? ""}`.toLowerCase();
  for (const n of NICHES) {
    if (PITCH[n.id] && (n.types.some((t) => has.includes(t)) || n.keywords?.some((k) => text.includes(k)))) return n.id;
  }
  for (const [id, types] of Object.entries(NICHE_ALIASES)) if (types.some((t) => has.includes(t))) return id;
  return "generic";
}

export interface FirstPitchInput {
  name: string;
  category?: string | null;
  types?: string[];
  area?: string | null;
  address?: string | null;
  rating?: number | null;
  hasWebsite: boolean;
  demoUrl?: string;
  rep: string;
}

/** The one-tap first WhatsApp message: client name, niche feature list, demo link. */
export function firstPitch(c: FirstPitchInput): string {
  const n = PITCH[pitchNicheId({ category: c.category, types: c.types, name: c.name })];
  // prices are only set in INR, so quote a price for India only
  const india = countryCodeFor(`${c.area ?? ""} ${c.address ?? ""}`) === "91";
  const lines = [
    `Hi ${c.name} team! 👋 This is ${c.rep} from ${AGENCY.name}.`,
    `I found *${c.name}* on Google Maps${c.rating ? ` — ${c.rating}★ is great!` : "."}`,
    c.hasWebsite
      ? "I have a few ideas to bring you more customers online."
      : "You don't have a website yet, so customers searching for you online can't see your details and go to a competitor.",
    "",
    `For ${n.plural} we build a website with:`,
    ...n.features.map((f) => `✅ ${f}`),
  ];
  if (c.demoUrl) lines.push("", `Here's a quick preview made for you: ${c.demoUrl}`);
  if (india) lines.push("", `Starting at ₹${MIN_PRICE.toLocaleString("en-IN")}.`);
  lines.push("", "Can I send you a quick preview?", "", c.rep, `${AGENCY.name} | ${AGENCY.site} | ${AGENCY.phone}`);
  return lines.join("\n");
}
