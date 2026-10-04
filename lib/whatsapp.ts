import { countryCodeFor } from "@/lib/area";

/**
 * Normalise a phone string to bare international digits for wa.me links.
 * "+971 50 123 4567" / "00971…" are used as typed; local numbers get the country code of `place`
 * (the lead's area/address text), or +91.
 */
export function toWhatsappNumber(phone: string | null | undefined, place?: string | null): string {
  if (!phone) return "";
  const d = phone.replace(/[^\d]/g, "");
  if (!d) return "";
  const cc = countryCodeFor(place);
  if (phone.trim().startsWith("+")) return d;
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return cc + d.slice(1);
  // bare local number (India is 10 digits; Gulf mobiles are 9) → prepend country code
  if (d.length === 10 || (cc !== "91" && d.length === 9)) return cc + d;
  return d;
}

/** WhatsApp number for a lead, using its area (falling back to address) to pick the country code. */
export function waNumber(b: { phone: string | null; area?: string | null; address?: string | null }): string {
  return toWhatsappNumber(b.phone, `${b.area ?? ""} ${b.address ?? ""}`);
}

export function whatsappLink(number: string, message?: string): string {
  if (!number) return "";
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${q}`;
}

export function directionsLink(
  lat: number | null | undefined,
  lng: number | null | undefined,
  address?: string | null,
): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return "";
}
