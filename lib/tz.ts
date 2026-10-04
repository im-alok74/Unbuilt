/** Returns `tz` if it is a valid IANA zone, else null. */
export function validTz(tz: string | null | undefined): string | null {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** Viewer zone (x-tz header) → APP_TZ env → Asia/Kolkata. */
export function pickTz(header?: string | null): string {
  return validTz(header) ?? validTz(process.env.APP_TZ) ?? "Asia/Kolkata";
}
