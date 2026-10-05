import { AGENCY, MIN_PRICE } from "@/lib/packages";
import { NICHES } from "@/lib/niches";
import { countryCodeFor } from "@/lib/area";

interface PitchNiche {
  /** Plural noun used in "…for {plural}". */
  plural: string;
  features: string[];
}

// What we pitch to each kind of business. Add a niche here (and its Google types in NICHE_ALIASES) to extend.
const PITCH: Record<string, PitchNiche> = {
  gym: {
    plural: "gyms & fitness studios",
    features: [
      "Membership plans, offers & online joining",
      "Class timetable with online slot booking",
      "Member login, attendance & renewal reminders",
      "Trainer profiles, diet plans & transformation gallery",
      "Free-trial / enquiry button straight to your WhatsApp",
    ],
  },
  cafe: {
    plural: "cafes",
    features: [
      "Photo menu with QR code for every table",
      "Online ordering, takeaway & table booking",
      "Offers, loyalty rewards & event pages",
      "Photo gallery, timings & one-tap directions",
      "Orders & enquiries straight to your WhatsApp",
    ],
  },
  restaurant: {
    plural: "restaurants",
    features: [
      "Photo menu with QR code for every table",
      "Online ordering, delivery links & table reservations",
      "Offers, combos, catering & party-booking pages",
      "Gallery, timings & one-tap directions",
      "Orders & reservations straight to your WhatsApp",
    ],
  },
  hotel: {
    plural: "hotels & stays",
    features: [
      "Room gallery, rates & amenities",
      "Direct booking requests with a booking calendar (no OTA commission)",
      "Offers, packages & event/wedding enquiry forms",
      "Nearby attractions and one-tap directions",
      "Guest reviews & enquiries to your WhatsApp",
    ],
  },
  school: {
    plural: "schools & institutes",
    features: [
      "Online admission forms & enquiry tracking",
      "Fee payment, receipts & due reminders",
      "Faculty, facilities, results & events pages",
      "Notice board and parent announcements",
      "Parent & student login area",
    ],
  },
  studio: {
    plural: "studios",
    features: [
      "Class / session schedule with online booking",
      "Packages, memberships & online payment",
      "Portfolio gallery & instructor profiles",
      "Student login, reminders & reviews",
      "Enquiries straight to your WhatsApp",
    ],
  },
  ngo: {
    plural: "NGOs & trusts",
    features: [
      "Online donations with instant receipts",
      "Volunteer sign-up & event registration",
      "Impact stories, reports & photo gallery",
      "Transparent fund-use & tax-receipt pages",
      "Newsletter & WhatsApp updates for supporters",
    ],
  },
  salon: {
    plural: "salons & spas",
    features: [
      "Services & price menu with online appointment booking",
      "Packages, memberships & gift cards with online payment",
      "Before/after gallery & stylist profiles",
      "Automatic reminders to cut no-shows",
      "Bookings straight to your WhatsApp",
    ],
  },
  clinic: {
    plural: "clinics",
    features: [
      "Doctor & treatment pages with online appointment booking",
      "Patient reminders, follow-ups & online payment",
      "Clinic timings, reviews & one-tap directions",
      "Health tips & blog that bring patients from Google",
      "Appointment requests straight to your WhatsApp",
    ],
  },
  generic: {
    plural: "local businesses",
    features: [
      "Your services, prices & photo gallery",
      "Online enquiry & booking forms",
      "Customer reviews & Google Maps directions",
      "Offers & announcements you can update yourself",
      "Enquiries straight to your WhatsApp",
    ],
  },
};

// Included with every website, whatever the niche.
const EVERY_SITE = [
  "💳 Built-in billing & invoicing: online payments, invoices, receipts & reports",
  "🛠 Fully customisable: your logo, colours, pages & features, changed to fit your business",
  "📊 Simple admin dashboard: customers, bookings & sales in one place",
  "🔎 Google-ready (SEO), fast on every phone, secure (SSL)",
];

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

/**
 * The one-tap first WhatsApp message. Written for the owner, but the number is often the shop's
 * general line, so it asks whoever answers to forward it. Keep it under ~1500 chars: the whole text
 * goes into the wa.me link, and very long links fail.
 */
export function firstPitch(c: FirstPitchInput): string {
  const n = PITCH[pitchNicheId({ category: c.category, types: c.types, name: c.name })];
  // prices are only set in INR, so quote a price for India only
  const india = countryCodeFor(`${c.area ?? ""} ${c.address ?? ""}`) === "91";
  const lines = [
    `Hello! 👋 *This message is for the owner of ${c.name}.* Kindly forward it to them. Thank you 🙏`,
    "",
    `I'm ${c.rep} from ${AGENCY.name}. I found *${c.name}* on Google Maps${c.rating ? ` (${c.rating}★, great reviews!)` : ""}. ${
      c.hasWebsite
        ? "I have a few ideas to bring you more customers online."
        : "You don't have a website yet, so customers who search for you can't see your details and often go to a competitor."
    }`,
    "",
    `We build a custom website *and* business software for ${n.plural}:`,
    ...n.features.map((f) => `✅ ${f}`),
    "",
    "On every plan:",
    ...EVERY_SITE,
  ];
  if (c.demoUrl) lines.push("", `Here's a preview made for you: ${c.demoUrl}`);
  if (india) lines.push("", `Starting at ₹${MIN_PRICE.toLocaleString("en-IN")}.`);
  lines.push("", "Reply *YES* and I'll send a free preview for your business, no obligation.", "", c.rep, `${AGENCY.name} | ${AGENCY.site} | ${AGENCY.phone}`);
  return lines.join("\n");
}
