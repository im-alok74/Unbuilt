// US states by postal abbreviation, so a Florida address resolves to the US (and to "Florida") even without "USA".
const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const US_ABBR = Object.keys(US_STATES).join("|");
// ", FL" with no ZIP counts too, except abbreviations that are everyday words ("in", "or", "me"…)
const US_ABBR_COMMA = Object.keys(US_STATES)
  .filter((k) => !["IN", "OR", "ME", "OK", "HI", "ID", "LA", "MA", "PA", "AL", "CO", "DE", "OH", "NE"].includes(k))
  .join("|");
const US_NAMES = Object.values(US_STATES).join("|");
// "USA", a state name, or "FL 33139" (state + ZIP)
const US_RE = new RegExp(String.raw`\busa\b|united states|\b(?:${US_NAMES})\b|\b(?:${US_ABBR})\s\d{5}\b|,\s*(?:${US_ABBR_COMMA})\b`, "i");

// Known markets: the area a lead is filed under, and the WhatsApp country code for it.
// Add a line to support a new market.
const PLACES: { name: string; re: RegExp; cc: string }[] = [
  { name: "Dubai", re: /dubai/i, cc: "971" },
  { name: "Abu Dhabi", re: /abu dhabi/i, cc: "971" },
  { name: "Sharjah", re: /sharjah/i, cc: "971" },
  { name: "Ajman", re: /ajman/i, cc: "971" },
  { name: "UAE", re: /\buae\b|emirates/i, cc: "971" },
  { name: "Qatar", re: /\bqatar\b|doha/i, cc: "974" },
  { name: "Saudi Arabia", re: /saudi|riyadh|jeddah/i, cc: "966" },
  { name: "Kuwait", re: /kuwait/i, cc: "965" },
  { name: "Oman", re: /\boman\b|muscat/i, cc: "968" },
  { name: "Bahrain", re: /bahrain|manama/i, cc: "973" },
  { name: "Singapore", re: /singapore/i, cc: "65" },
  { name: "UK", re: /london|\buk\b|united kingdom|england/i, cc: "44" },
  { name: "USA", re: US_RE, cc: "1" },
  { name: "Canada", re: /canada|toronto/i, cc: "1" },
  { name: "Australia", re: /australia|sydney|melbourne/i, cc: "61" },
];

/** WhatsApp country code from any place text (area and/or address); India (91) when nothing matches. */
export function countryCodeFor(text: string | null | undefined): string {
  return placeIn(text)?.cc ?? "91";
}

/**
 * The known place for an address: the country mentioned LAST wins (addresses end with the city/country,
 * business names come first), and within that country the most specific entry ("Dubai" over "UAE").
 * Returns null when "India" is mentioned last, since India is the default and not in PLACES.
 */
function placeIn(text: string | null | undefined) {
  const t = text ?? "";
  const hits: { p: (typeof PLACES)[number]; at: number }[] = [];
  for (const p of PLACES) {
    const g = new RegExp(p.re.source, "gi");
    let m: RegExpExecArray | null;
    let last = -1;
    while ((m = g.exec(t))) last = m.index;
    if (last >= 0) hits.push({ p, at: last });
  }
  if (!hits.length) return null;
  const lastHit = hits.reduce((a, b) => (b.at > a.at ? b : a));
  const india = t.toLowerCase().lastIndexOf("india");
  if (india > lastHit.at) return null;
  return hits.filter((h) => h.p.cc === lastHit.p.cc).sort((a, b) => PLACES.indexOf(a.p) - PLACES.indexOf(b.p))[0].p;
}

/** Best-guess area for an address: a known market, else the city part of "…, City, State 560038, India". */
export function deriveArea(address: string | null | undefined): string | null {
  const a = address?.trim();
  if (!a) return null;
  const hit = placeIn(a);
  if (hit?.name === "USA") return usState(a) ?? "USA"; // file US leads by state: Florida, Texas…
  if (hit) return hit.name;
  const parts = a.split(",").map((s) => s.trim()).filter((p) => p && !/^india$/i.test(p));
  if (parts.length > 1 && /\d/.test(parts[parts.length - 1])) parts.pop(); // state + pin
  if (parts.length < 2) return null;
  return parts[parts.length - 1].replace(/\d+/g, "").trim() || null;
}

// Calling codes recognised on explicit "+" numbers, longest first so "+971" isn't read as "+9…".
const CALLING_CODES = [...new Set([...PLACES.map((p) => p.cc), "91"])].sort((a, b) => b.length - a.length);

/**
 * Canonical key for "is this the same phone number?" (dedupe, do-not-contact).
 * India stays the bare 10-digit number (so existing do-not-contact rows still match);
 * every other country is "+<code><national number>", so +1 415… and +91 415… never collide
 * and "0501234567" (Dubai) matches "+971 50 123 4567". `hint` = the lead's area/address,
 * used to pick the country for numbers typed without a "+". "" when there aren't enough digits.
 */
export function normPhone(phone: string | null | undefined, hint?: string | null): string {
  const raw = (phone ?? "").trim().replace(/\(0\)/g, ""); // "+971 (0) 50…" → trunk 0 dropped
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  let intl = raw.startsWith("+");
  if (!intl && d.startsWith("00")) {
    intl = true;
    d = d.slice(2);
  }
  const cc = intl ? CALLING_CODES.find((c) => d.startsWith(c)) : countryCodeFor(hint);
  if (!cc) return d.length >= 8 ? "+" + d : ""; // a country we don't list: keep it distinct, unmatched by local forms
  let nat = intl ? d.slice(cc.length) : d;
  if (cc === "91") return nat.length >= 10 ? nat.slice(-10) : "";
  nat = nat.replace(/^0+/, "");
  // typed with the country code but no "+", e.g. 971501234567
  if (!intl && nat.startsWith(cc) && nat.length - cc.length >= 8) nat = nat.slice(cc.length);
  return nat.length >= 6 ? "+" + cc + nat : "";
}

/** The US state in an address ("…, Miami, FL 33139" or "Tampa, Florida"), else null. */
function usState(a: string): string | null {
  const abbr = a.match(new RegExp(String.raw`\b(${US_ABBR})\s\d{5}\b|,\s*(${US_ABBR_COMMA})\b`, "i"))?.slice(1).find(Boolean)?.toUpperCase();
  if (abbr) return US_STATES[abbr];
  const named = Object.values(US_STATES).filter((n) => new RegExp(String.raw`\b${n}\b`, "i").test(a));
  return named.length ? named[named.length - 1] : null;
}
