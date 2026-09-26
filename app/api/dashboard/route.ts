import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSession, STAFF } from "@/lib/session";
import { placesBudget } from "@/lib/places";

export const dynamic = "force-dynamic";

const DAY = sql`date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`;
const WEEK = sql`date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`;

export async function GET() {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;

  const [funnel, reps, stale, totals, requests, budget, deals] = await Promise.all([
    db.execute(sql`select stage, count(*)::int as n from leads where assigned_to is not null group by stage`),
    db.execute(sql`
      select u.id, u.display_name as name, u.commission_pct as "commissionPct", u.daily_target as "dailyTarget",
        (select count(*) from leads l where l.assigned_to = u.id)::int as assigned,
        (select count(*) from leads l where l.assigned_to = u.id and l.stage not in ('new'))::int as worked,
        (select count(*) from leads l where l.assigned_to = u.id and l.stage in ('quoted','negotiating'))::int as quotes,
        (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won,
        coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won'), 0)::int as revenue,
        coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won' and not l.commission_paid), 0)::int as "unpaidValue",
        (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${DAY})::int as "contactsToday",
        (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${WEEK})::int as "contactsWeek"
      from users u where u.role = 'rep' and u.is_active order by "contactsWeek" desc, u.display_name`),
    // Assigned leads nobody has touched for 3+ days (new, or last activity old).
    db.execute(sql`
      select b.id as "businessId", b.name, u.display_name as rep, l.stage,
             coalesce((select max(a.created_at) from lead_activity a where a.lead_id = l.id and a.action <> 'assigned'), l.assigned_at) as "lastTouch"
      from leads l join businesses b on b.id = l.business_id join users u on u.id = l.assigned_to
      where l.stage not in ('won','lost')
        and coalesce((select max(a.created_at) from lead_activity a where a.lead_id = l.id and a.action <> 'assigned'), l.assigned_at) < now() - interval '3 days'
      order by "lastTouch" limit 30`),
    db.execute(sql`
      select (select count(*) from businesses)::int as businesses,
             (select count(*) from leads where assigned_to is null)::int as unassigned,
             coalesce((select sum(l.project_value) from leads l where l.stage = 'won'), 0)::int as revenue,
             coalesce((select sum(l.project_value * u.commission_pct / 100) from leads l join users u on u.id = l.assigned_to where l.stage = 'won' and not l.commission_paid), 0)::int as "commissionOwed",
             coalesce((select sum(l.project_value * u.commission_pct / 100) from leads l join users u on u.id = l.assigned_to where l.stage = 'won' and l.commission_paid), 0)::int as "commissionPaid"`),
    db.execute(sql`select count(*)::int as n from lead_requests where status = 'pending'`),
    placesBudget(),
    db.execute(sql`
      select b.id as "businessId", b.name, u.display_name as rep, l.project_value as value, u.commission_pct as pct,
             (l.project_value * u.commission_pct / 100)::int as commission, l.commission_paid as paid, l.updated_at as "wonAt"
      from leads l join businesses b on b.id = l.business_id left join users u on u.id = l.assigned_to
      where l.stage = 'won' order by l.updated_at desc limit 50`),
  ]);

  return NextResponse.json({
    funnel: funnel.rows,
    reps: reps.rows,
    stale: stale.rows,
    totals: totals.rows[0],
    pendingRequests: (requests.rows[0] as { n: number }).n,
    budget,
    deals: deals.rows,
  });
}
