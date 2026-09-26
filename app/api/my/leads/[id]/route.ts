import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, leads, leadActivity, users, dnc } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getBusinessRow } from "@/lib/rows";
import { ensureLead, logActivity, updateLead } from "@/lib/leads";
import { normPhone } from "@/lib/phone";
import { notifyStaff } from "@/lib/push";
import { STAGES } from "@/lib/types";
import { PACKAGES, MIN_PRICE, MAX_PRICE } from "@/lib/packages";

export const dynamic = "force-dynamic";

/** :id is the business id. Reps may only touch leads assigned to them; staff may touch any. */
async function guard(businessId: string) {
  const s = await requireSession();
  if (s instanceof NextResponse) return { err: s } as const;
  const [l] = await db.select().from(leads).where(eq(leads.businessId, businessId)).limit(1);
  if (s.role === "rep" && l?.assignedTo !== s.userId) {
    return { err: NextResponse.json({ error: "Not your lead" }, { status: 403 }) } as const;
  }
  return { s, lead: l ?? null } as const;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if ("err" in g) return g.err;
  const business = await getBusinessRow(id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const activity = g.lead
    ? await db
        .select({
          id: leadActivity.id,
          action: leadActivity.action,
          detail: leadActivity.detail,
          at: leadActivity.createdAt,
          by: users.displayName,
        })
        .from(leadActivity)
        .leftJoin(users, eq(users.id, leadActivity.userId))
        .where(eq(leadActivity.leadId, g.lead.id))
        .orderBy(desc(leadActivity.createdAt))
        .limit(50)
    : [];
  return NextResponse.json({ business, activity });
}

const patchSchema = z.object({
  stage: z.enum(STAGES as [string, ...string[]]).optional(),
  notes: z.string().max(4000).optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  projectValue: z.number().int().min(1).max(100_000_000).optional(),
  /** The quote just sent: package id and price (INR). Moves an early lead to Quoted. */
  quote: z.object({ package: z.enum(PACKAGES.map((p) => p.id) as [string, ...string[]]), amount: z.number().int().min(MIN_PRICE).max(MAX_PRICE) }).optional(),
  /** A touch to record: a tap on Call/WhatsApp, an outcome tag, or a do-not-call flag. */
  log: z
    .object({
      action: z.enum(["called", "whatsapped", "note", "no_answer", "callback", "not_interested", "wrong_number", "dnc"]),
      detail: z.string().max(500).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if ("err" in g) return g.err;
  const p = patchSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { log, quote, ...patch } = p.data;
  const stage = patch.stage as (typeof STAGES)[number] | undefined;

  if (stage === "won" && !patch.projectValue && !g.lead?.projectValue) {
    return NextResponse.json({ error: "Enter the project value to mark this Won." }, { status: 400 });
  }

  const lead = await ensureLead(id);
  await updateLead(id, g.s.userId, { ...patch, stage, ...(quote ? { quotePackage: quote.package, quoteAmount: quote.amount } : {}) });
  if (quote && !stage && ["new", "contacted", "demo_sent"].includes(lead.stage)) {
    await updateLead(id, g.s.userId, { stage: "quoted" });
  }

  // First real touch moves a "new" lead to "contacted".
  const touched = log && ["called", "whatsapped", "no_answer", "callback", "not_interested", "wrong_number"].includes(log.action);
  if (touched && !stage && !quote && lead.stage === "new") await updateLead(id, g.s.userId, { stage: "contacted" });

  if (log) {
    await logActivity(lead.id, g.s.userId, log.action, log.detail);
    if (log.action === "dnc" || log.action === "wrong_number") {
      const [b] = await db.select({ phone: businesses.phone }).from(businesses).where(eq(businesses.id, id)).limit(1);
      const ph = normPhone(b?.phone);
      if (ph) {
        await db.insert(dnc).values({ phone: ph, reason: log.action, addedBy: g.s.userId }).onConflictDoNothing();
      }
      await updateLead(id, g.s.userId, { stage: "lost" });
    }
    if (log.action === "not_interested" && !stage) await updateLead(id, g.s.userId, { stage: "lost" });
  }

  if (stage === "won" && g.s.role === "rep") {
    const b = await getBusinessRow(id);
    await notifyStaff({
      title: "Deal won",
      body: `${g.s.name} won ${b?.name ?? "a lead"}${patch.projectValue ? ` — ₹${patch.projectValue.toLocaleString("en-IN")}` : ""}`,
      url: "/team",
    });
  }

  return NextResponse.json({ business: await getBusinessRow(id) });
}
