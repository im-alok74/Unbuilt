import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, leadActivity } from "@/lib/db/schema";
import { stageToStatus, type Stage } from "@/lib/types";
import { revalidateLeadsCache } from "@/lib/cache";

export async function ensureLead(businessId: string) {
  await db.insert(leads).values({ businessId }).onConflictDoNothing();
  const [l] = await db.select().from(leads).where(eq(leads.businessId, businessId)).limit(1);
  return l;
}

export async function logActivity(leadId: string, userId: string | null, action: string, detail?: string) {
  await db.insert(leadActivity).values({ leadId, userId, action, detail: detail ?? null });
}

/** Patch a lead's pipeline fields and keep the legacy `status` (map pin colour) in sync. */
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
) {
  const l = await ensureLead(businessId);
  const set: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (patch.stage && patch.stage !== l.stage) {
    set.stage = patch.stage;
    set.status = stageToStatus(patch.stage);
    await logActivity(l.id, userId, "stage", `${l.stage} → ${patch.stage}`);
  }
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.nextFollowUp !== undefined) {
    set.nextFollowUp = patch.nextFollowUp ? new Date(patch.nextFollowUp) : null;
    await logActivity(l.id, userId, "follow_up", patch.nextFollowUp ?? "cleared");
  }
  if (patch.projectValue !== undefined) set.projectValue = patch.projectValue;
  if (patch.pitchText !== undefined) set.pitchText = patch.pitchText;
  if (patch.commissionPaid !== undefined) set.commissionPaid = patch.commissionPaid;
  if (patch.quoteAmount !== undefined) {
    set.quoteAmount = patch.quoteAmount;
    set.quotePackage = patch.quotePackage ?? null;
    await logActivity(l.id, userId, "quote", `${patch.quotePackage ?? "custom"} ₹${patch.quoteAmount.toLocaleString("en-IN")}`);
  }
  await db.update(leads).set(set).where(eq(leads.id, l.id));
  revalidateLeadsCache();
  return l.id;
}
