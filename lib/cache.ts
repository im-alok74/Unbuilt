import "server-only";
import { revalidateTag } from "next/cache";

export const LEADS_LIST_TAG = "leads-list";
export const NICHE_LEADS_TAG = "niche-leads";

/** Call after any write that changes business/lead/site data, so cached reads refresh. */
export function revalidateLeadsCache() {
  revalidateTag(LEADS_LIST_TAG);
  revalidateTag(NICHE_LEADS_TAG);
}
