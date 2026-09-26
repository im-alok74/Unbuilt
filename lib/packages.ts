/**
 * What we sell and how to price it, in plain language. Based on web111.site/pricing
 * (Starter from ₹5,000 up to Growth ₹30-50k, all negotiable), extended to ₹1,00,000 for custom builds.
 */

export const AGENCY = {
  name: "Web111 Solutions",
  site: "web111.site",
  phone: "+91 63866 44350",
};

export const MIN_PRICE = 5000;
export const MAX_PRICE = 100000;

export interface Package {
  id: string;
  name: string;
  /** One line a non-technical client understands. */
  promise: string;
  min: number;
  max: number;
  timeline: string;
  support: string;
  /** Plain-language inclusions, shown to the client. */
  includes: string[];
  bestFor: string;
}

export const PACKAGES: Package[] = [
  {
    id: "starter",
    name: "Starter",
    promise: "A clean one-page website so customers can find you and contact you.",
    min: 5000,
    max: 9000,
    timeline: "1-2 weeks",
    support: "30 days of free support after launch",
    includes: ["One-page website that looks great on phones", "Contact form and WhatsApp button", "Google Maps location", "Basic Google search setup (SEO)", "Secure padlock (SSL)"],
    bestFor: "Shops, clinics and small businesses getting online for the first time",
  },
  {
    id: "premium",
    name: "Premium",
    promise: "A proper multi-page website that makes your business look established.",
    min: 10000,
    max: 15000,
    timeline: "2-3 weeks",
    support: "45 days of free support after launch",
    includes: ["Up to 6 pages (Home, About, Services, Gallery, Contact…)", "Polished design with smooth animations", "Enquiry forms and Google Maps", "Stronger Google search setup", "Visitor analytics"],
    bestFor: "Businesses that want to look professional and get regular enquiries",
  },
  {
    id: "plus",
    name: "Premium Plus",
    promise: "A custom-looking website you can update yourself, with a blog.",
    min: 25000,
    max: 30000,
    timeline: "3-5 weeks",
    support: "60 days of support plus 1 month of maintenance",
    includes: ["Up to 15 pages", "Custom design made for your brand", "Easy editor so you can change text and photos yourself", "Blog", "Advanced Google search setup", "Visitor analytics"],
    bestFor: "Serious businesses that keep adding content or offers",
  },
  {
    id: "growth",
    name: "Growth",
    promise: "A full business platform: online shop, bookings, member logins and more.",
    min: 30000,
    max: 50000,
    timeline: "6-8 weeks",
    support: "90 days of support plus 3 months of maintenance",
    includes: ["Unlimited pages", "Online shop or booking system", "Customer logins", "Online payments", "Custom design and advanced integrations", "Conversion improvements"],
    bestFor: "Brands that want to sell or take bookings online",
  },
  {
    id: "custom",
    name: "Custom Build",
    promise: "A made-to-order web app or platform designed around how your business works.",
    min: 50000,
    max: 100000,
    timeline: "8-16 weeks (agreed upfront)",
    support: "90 days of support plus 3 months of maintenance",
    includes: ["Your own app or system built to your needs", "Admin panel to manage everything", "Payments, notifications and integrations", "Scales as you grow"],
    bestFor: "Bigger projects that need something built from scratch",
  },
];

export function getPackage(id: string | null | undefined): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function packageForPrice(a: number): Package {
  if (a < 10000) return PACKAGES[0];
  if (a < 25000) return PACKAGES[1];
  if (a <= 30000) return PACKAGES[2];
  if (a <= 50000) return PACKAGES[3];
  return PACKAGES[4];
}

// ─── The "what do they need?" questions, in the client's own words ────────────

export interface Choice<T extends string | number = string> {
  id: T;
  label: string;
  hint?: string;
  points: number;
}

export const KINDS: Choice[] = [
  { id: "landing", label: "Just be found online", hint: "One page with contact details", points: 1 },
  { id: "business", label: "A proper business website", hint: "Several pages", points: 2 },
  { id: "cms", label: "Website they can edit themselves", hint: "Change text, photos, add a blog", points: 3 },
  { id: "shop", label: "Sell products or take bookings online", hint: "Shop, appointments, payments", points: 4 },
  { id: "app", label: "A custom app or system", hint: "Built specially for their work", points: 4.5 },
  { id: "redesign", label: "Fix or redo their old website", hint: "Already has one that looks dated", points: 1.5 },
];

export const PAGES: Choice<number>[] = [
  { id: 1, label: "1 page", points: 0 },
  { id: 6, label: "Up to 6", points: 0 },
  { id: 15, label: "Up to 15", points: 0.5 },
  { id: 30, label: "More than 15", points: 1 },
];

export const EXTRAS: Choice[] = [
  { id: "cms", label: "They edit content themselves", points: 1 },
  { id: "payments", label: "Take payments online", points: 0.5 },
  { id: "booking", label: "Appointment booking", points: 0.5 },
  { id: "logins", label: "Customer logins", points: 0.5 },
  { id: "blog", label: "Blog", points: 0.25 },
  { id: "branding", label: "Logo / branding help", points: 0.25 },
  { id: "photos", label: "Needs photos or content written", points: 0.25 },
  { id: "whatsapp", label: "WhatsApp chat button", points: 0 },
];

export interface Needs {
  kind: string;
  pages: number;
  extras: string[];
}

// score → price, interpolated between these points
const CURVE: [number, number][] = [
  [0, 5000],
  [1, 5000],
  [2, 12000],
  [3, 25000],
  [4, 32000],
  [5, 42000],
  [6, 60000],
  [7, 80000],
  [8, 100000],
];

// Extras a kind already includes in its base price, so they are not charged twice
const IMPLIED: Record<string, string[]> = { cms: ["cms", "blog"], shop: ["payments", "booking"] };

export function scoreNeeds(n: Needs): number {
  const k = KINDS.find((x) => x.id === n.kind)?.points ?? 0;
  const p = PAGES.find((x) => x.id === n.pages)?.points ?? 0;
  const skip = IMPLIED[n.kind] ?? [];
  const e = n.extras.filter((id) => !skip.includes(id)).reduce((s, id) => s + (EXTRAS.find((x) => x.id === id)?.points ?? 0), 0);
  return Math.max(0, k + p + e);
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function suggestPrice(n: Needs): { price: number; low: number; high: number; pkg: Package } {
  const s = Math.min(8, scoreNeeds(n));
  let price = MAX_PRICE;
  for (let i = 1; i < CURVE.length; i++) {
    if (s <= CURVE[i][0]) {
      const [x0, y0] = CURVE[i - 1];
      const [x1, y1] = CURVE[i];
      price = y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }
  price = Math.min(MAX_PRICE, Math.max(MIN_PRICE, roundTo(price, 500)));
  const low = Math.max(MIN_PRICE, roundTo(price * 0.85, 500));
  const high = Math.min(MAX_PRICE, roundTo(price * 1.15, 500));
  return { price, low, high, pkg: packageForPrice(price) };
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** The quote the rep sends on WhatsApp. */
export function quoteMessage(o: { client: string; business: string; rep: string; pkg: Package; amount: number }): string {
  return [
    `Hi ${o.client || "there"}, thank you for your time. Here is the quote for *${o.business}*:`,
    "",
    `*${o.pkg.name} package: ${inr(o.amount)}*`,
    o.pkg.promise,
    "",
    "What you get:",
    ...o.pkg.includes.map((x) => `• ${x}`),
    "",
    `Delivery: ${o.pkg.timeline}`,
    `Support: ${o.pkg.support}`,
    "",
    "The price is fixed once we agree, no hidden charges, and the website, domain and hosting are all in your name.",
    "If this looks good, just reply YES and I will get you started.",
    "",
    `${o.rep}`,
    `${AGENCY.name} | ${AGENCY.site} | ${AGENCY.phone}`,
  ].join("\n");
}
