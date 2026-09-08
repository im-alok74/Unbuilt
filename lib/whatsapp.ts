/** Normalise a phone string to bare international digits for wa.me links. */
export function toWhatsappNumber(
  phone: string | null | undefined,
  defaultCountryCode = "91",
): string {
  if (!phone) return "";
  let d = phone.replace(/[^\d]/g, "");
  if (!d) return "";
  // 0-prefixed local → replace leading 0 with country code
  if (d.startsWith("0")) d = defaultCountryCode + d.slice(1);
  // bare 10-digit local (India) → prepend country code
  if (d.length === 10) d = defaultCountryCode + d;
  return d;
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
