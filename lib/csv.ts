import type { BusinessRow } from "@/lib/types";
import { LEAD_STATUS_LABELS, SITE_STATUS_LABELS } from "@/lib/types";

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(rows: BusinessRow[]): string {
  const headers = [
    "Name",
    "Category",
    "Score %",
    "Has website",
    "Website",
    "Rating",
    "Reviews",
    "Photos",
    "Phone",
    "Address",
    "Lead status",
    "Site status",
    "Quote (INR)",
    "Notes",
    "Last scanned",
    "Google Place ID",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        cell(r.name),
        cell(r.categoryLabel ?? r.category),
        cell(r.score),
        cell(r.hasWebsite ? "Yes" : "No"),
        cell(r.websiteRaw),
        cell(r.rating),
        cell(r.reviewCount),
        cell(r.photoCount),
        cell(r.phone),
        cell(r.address),
        cell(LEAD_STATUS_LABELS[r.leadStatus]),
        cell(r.siteStatus ? SITE_STATUS_LABELS[r.siteStatus] : ""),
        cell(r.quotePrice ?? ""),
        cell(r.notes),
        cell(r.lastScannedAt),
        cell(r.placeId),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}
