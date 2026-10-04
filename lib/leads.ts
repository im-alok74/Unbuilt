import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, leadActivity } from "@/lib/db/schema";
import { stageToStatus, canMove, type Stage } from "@/lib/types";
import { revalidateLeadsCache } from "@/lib/cache";

/** The pool itself or a transaction handle, so callers can group writes. */
export type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function ensureLead(businessId: string, q: Db = db) {
  await q.insert(leads).values({ businessId }).onConflictDoNothing();
  const [l] = await q.select().from(leads).where(eq(leads.businessId, businessId)).limit(1);
  return l;
}

export async function logActivity(leadId: string, userId: string | null, action: string, detail?: string, q: Db = db) {
  await q.insert(leadActivity).values({ leadId, userId, action, detail: detail ?? null });
}

/**
 * Patch a lead's pipeline fields and keep the legacy `status` (map pin colour) in sync.
 * `staff` (default true) lets won/lost be reopened; pass false for reps. Pass `tx` to
 * join a caller's transaction (the caller then revalidates the cache after commit).
 */
export async function updateLead(
  businessId: string,
  userId: string,
  patch: {
    stage?: Stage;
    notes?: string;
    nextFollowUp?: string | null;
    projectValue?: number | null;
    pitchText?: string | null;
    commissionPaid?: boolean;
    quotePackage?: string;
    quoteAmount?: number;
  },
  opts: { staff?: boolean; tx?: Db } = {},
) {
  const q = opts.tx ?? db;
  const l = await ensureLead(businessId, q);
  const now = new Date();
  const set: Partial<typeof leads.$inferInsert> = { updatedAt: now };
  if (patch.stage && patch.stage !== l.stage && canMove(l.stage as Stage, patch.stage, opts.staff ?? true)) {
    set.stage = patch.stage;
    set.status = stageToStatus(patch.stage);
    set.wonAt = patch.stage === "won" ? now : null;
    await logActivity(l.id, userId, "stage", `${l.stage} → ${patch.stage}`, q);
  }
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.nextFollowUp !== undefined) {
    set.nextFollowUp = patch.nextFollowUp ? new Date(patch.nextFollowUp) : null;
    await logActivity(l.id, userId, "follow_up", patch.nextFollowUp ?? "cleared", q);
  }
  if (patch.projectValue !== undefined) set.projectValue = patch.projectValue;
  if (patch.pitchText !== undefined) set.pitchText = patch.pitchText;
  if (patch.commissionPaid !== undefined) set.commissionPaid = patch.commissionPaid;
  if (patch.quoteAmount !== undefined) {
    set.quoteAmount = patch.quoteAmount;
    set.quotePackage = patch.quotePackage ?? null;
    await logActivity(l.id, userId, "quote", `${patch.quotePackage ?? "custom"} ₹${patch.quoteAmount.toLocaleString("en-IN")}`, q);
  }
  await q.update(leads).set(set).where(eq(leads.id, l.id));
  if (!opts.tx) revalidateLeadsCache();
  return l.id;
}
