import type { CopyContext, GeneratedCopy } from "./provider";

const BY_CATEGORY: Record<
  string,
  { tagline: string; headline: string; sub: string; cta: string; services: [string, string][] }
> = {
  restaurant: {
    tagline: "Fresh food, made daily",
    headline: "A neighbourhood table worth coming back to",
    sub: "Home-style cooking, generous portions, and a welcome that feels like family. Walk in or reserve ahead.",
    cta: "Book a table",
    services: [
      ["Dine-in", "Comfortable seating and a menu that changes with the season."],
      ["Takeaway", "Call ahead and your order is packed and ready."],
      ["Party bookings", "Space and set menus for birthdays and small gatherings."],
    ],
  },
  cafe: {
    tagline: "Good coffee, slow mornings",
    headline: "Your corner for coffee and a quiet minute",
    sub: "Carefully pulled espresso, fresh bakes, and free WiFi. Open early, every day.",
    cta: "See the menu",
    services: [
      ["Espresso bar", "Single-origin beans, roasted locally, poured well."],
      ["Fresh bakes", "Croissants, cakes and sandwiches made in-house."],
      ["Work-friendly", "Plenty of plugs, fast WiFi, no rush."],
    ],
  },
  hair_salon: {
    tagline: "Cuts, colour, and care",
    headline: "Leave looking like the best version of you",
    sub: "Skilled stylists, honest advice, and a chair that never feels rushed.",
    cta: "Book an appointment",
    services: [
      ["Cut & style", "A consultation first, then a cut that suits your hair and your week."],
      ["Colour", "Balayage, highlights, gloss and grey coverage."],
      ["Treatments", "Repair and smoothing treatments for tired hair."],
    ],
  },
  beauty_salon: {
    tagline: "Calm, clean, expert",
    headline: "A little time that's just for you",
    sub: "Facials, waxing, threading and nails in a spotless, unhurried space.",
    cta: "Reserve a slot",
    services: [
      ["Skincare", "Facials and clean-ups matched to your skin, not a script."],
      ["Waxing & threading", "Quick, careful, and as painless as it gets."],
      ["Nails", "Manicures and pedicures that actually last."],
    ],
  },
  gym: {
    tagline: "Show up. Get stronger.",
    headline: "Train hard in a place that has your back",
    sub: "Proper equipment, real coaching, and a floor that isn't packed at 7am.",
    cta: "Start a trial",
    services: [
      ["Strength floor", "Racks, plates and space to actually use them."],
      ["Coaching", "Form checks and programmes, not just a key card."],
      ["Classes", "Group sessions that push you without the theatre."],
    ],
  },
  general_contractor: {
    tagline: "Built right, on time",
    headline: "Renovations and fit-outs, handled end to end",
    sub: "Clear quotes, tidy sites, and work that holds up. One point of contact from start to finish.",
    cta: "Get a quote",
    services: [
      ["Home renovation", "Kitchens, bathrooms and full interiors."],
      ["Commercial fit-out", "Shops and offices turned around on schedule."],
      ["Repairs & maintenance", "Small jobs done properly, not put off."],
    ],
  },
  dentist: {
    tagline: "Gentle, modern dentistry",
    headline: "Dental care without the dread",
    sub: "Straight answers, careful hands, and appointments that run on time.",
    cta: "Book a check-up",
    services: [
      ["Check-ups & cleaning", "Routine visits that keep problems small."],
      ["Fillings & crowns", "Tooth-coloured work that blends in."],
      ["Whitening & alignment", "Simple cosmetic options explained clearly."],
    ],
  },
  doctor: {
    tagline: "Everyday care, close to home",
    headline: "A clinic that knows your name",
    sub: "Unhurried consultations, same-week appointments, and follow-up that actually follows up.",
    cta: "Book a visit",
    services: [
      ["General consultation", "For the coughs, aches and questions that come up."],
      ["Health checks", "Screening and reports, explained in plain language."],
      ["Ongoing care", "Managing long-term conditions with a steady hand."],
    ],
  },
  bakery: {
    tagline: "Baked fresh, every morning",
    headline: "The smell of fresh bread, every day",
    sub: "Breads, cakes and pastries made from scratch on-site. Order ahead for celebrations.",
    cta: "See what's baking",
    services: [
      ["Daily bakes", "Sourdough, soft rolls and everything in between."],
      ["Cakes to order", "Birthdays, anniversaries and 'just because'."],
      ["Coffee & a seat", "A warm corner to enjoy it in."],
    ],
  },
  bar: {
    tagline: "Your local, done right",
    headline: "A proper local worth walking to",
    sub: "A tight drinks list, easy food, and a room that's actually nice to sit in.",
    cta: "See what's on",
    services: [
      ["Drinks", "Craft on tap, honest wine, cocktails without the fuss."],
      ["Kitchen", "Small plates and sharing boards till late."],
      ["Book the space", "Corners and back rooms for groups."],
    ],
  },
  spa: {
    tagline: "Switch off for an hour",
    headline: "An hour that's entirely yours",
    sub: "Massage, facials and body treatments in a calm, spotless space.",
    cta: "Book a treatment",
    services: [
      ["Massage", "Deep tissue, relaxation, and everything between."],
      ["Facials", "Matched to your skin, not a template."],
      ["Packages", "Half-days and gift vouchers."],
    ],
  },
  nail_salon: {
    tagline: "Nails that last",
    headline: "Careful hands, colours that don't chip by Tuesday",
    sub: "Manicures, pedicures and gel work in a clean, unhurried studio.",
    cta: "Book a slot",
    services: [
      ["Manicure & pedicure", "Classic and gel, done properly."],
      ["Nail art", "As subtle or as bold as you want."],
      ["Repairs", "Quick fixes when one goes."],
    ],
  },
  plumber: {
    tagline: "Turn up. Fix it. Tidy up.",
    headline: "A plumber who calls back",
    sub: "Leaks, blockages, installs and emergencies — clear pricing before any work starts.",
    cta: "Get a callout",
    services: [
      ["Repairs & leaks", "Found fast, fixed properly."],
      ["Bathrooms & kitchens", "Full installs and swap-outs."],
      ["Emergencies", "Same-day for the ones that can't wait."],
    ],
  },
  electrician: {
    tagline: "Safe, tidy, certified",
    headline: "Electrical work done to the letter",
    sub: "Rewires, faults, extra sockets and inspections — certified and signed off.",
    cta: "Request a quote",
    services: [
      ["Fault finding", "Tracing the problem, not guessing."],
      ["Installations", "Sockets, lighting, EV points, fuse boards."],
      ["Safety checks", "Certificates for landlords and sales."],
    ],
  },
  car_repair: {
    tagline: "Honest work on your car",
    headline: "Repairs without the runaround",
    sub: "Diagnostics, servicing and repairs with a quote you can trust before we start.",
    cta: "Book it in",
    services: [
      ["Servicing", "Routine work that keeps small things small."],
      ["Repairs", "Brakes, clutches, suspension, electrics."],
      ["Diagnostics", "Warning light? We'll tell you what it actually is."],
    ],
  },
  clothing_store: {
    tagline: "Pieces worth keeping",
    headline: "A wardrobe you'll actually wear",
    sub: "A tight, well-chosen range and staff who'll tell you the truth about the fit.",
    cta: "Visit the shop",
    services: [
      ["In store", "New arrivals every week, in-person fitting."],
      ["Alterations", "Small tweaks that make a big difference."],
      ["Personal picks", "Tell us the occasion, we'll pull options."],
    ],
  },
};

const GENERIC = {
  tagline: "Local, trusted, close by",
  headline: "The local name people recommend",
  sub: "Straightforward service, fair prices, and a team that turns up when it says it will.",
  cta: "Get in touch",
  services: [
    ["What we do", "The core service, done properly and without fuss."],
    ["Why us", "Local, responsive, and easy to deal with."],
    ["Get started", "A quick call is all it takes to begin."],
  ] as [string, string][],
};

export function generateMockCopy(ctx: CopyContext): GeneratedCopy {
  const key = ctx.business.category ?? "";
  const base = BY_CATEGORY[key] ?? GENERIC;
  const name = ctx.business.name;
  const area = ctx.business.address?.split(",").slice(-2, -1)[0]?.trim();
  return {
    tagline: base.tagline,
    heroHeadline: base.headline,
    heroSub: base.sub,
    ctaLabel: base.cta,
    aboutTitle: "About us",
    aboutBody: `${name} is a ${
      ctx.business.categoryLabel?.toLowerCase() ?? "local business"
    }${area ? ` in ${area}` : ""}. ${base.sub}`,
    services: base.services.map(([title, body]) => ({ title, body })),
    footerNote: ctx.business.rating
      ? `Rated ${ctx.business.rating}★ on Google`
      : "Serving the neighbourhood",
    _provider: "mock",
  };
}
