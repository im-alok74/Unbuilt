import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSession, STAFF } from "@/lib/session";
import { placesBudget } from "@/lib/places";
import { LEADS_LIST_TAG } from "@/lib/cache";
import { pickTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
/** sum() comes back as a bigint string; convert the named columns to numbers. */
const nums = (rows: Row[], ...keys: string[]) =>
  rows.map((r) => {
    const o = { ...r };
    for (const k of keys) o[k] = Number(o[k] ?? 0);
    return o;
  });

const load = unstable_cache(
  async (tz: string) => {
    const DAY = sql`date_trunc('day', now() at time zone ${tz}::text) at time zone ${tz}::text`;
    const WEEK = sql`date_trunc('week', now() at time zone ${tz}::text) at time zone ${tz}::text`;
    const MONTH = sql`date_trunc('month', now() at time zone ${tz}::text) at time zone ${tz}::text`;

    const [funnel, reps, stale, totals, requests, budget, deals] = await Promise.all([
      db.execute(sql`select stage, count(*)::int as n from leads where assigned_to is not null group by stage`),
      // ponytail: correlated subqueries per rep (reps are few); GROUP BY assigned_to if the team grows past ~50.
      db.execute(sql`
        select u.id, u.display_name as name, u.phone, coalesce(u.commission_pct, 0) as "commissionPct", u.daily_target as "dailyTarget",
          (select count(*) from leads l where l.assigned_to = u.id)::int as assigned,
          (select count(*) from leads l where l.assigned_to = u.id and l.stage not in ('new'))::int as worked,
          (select count(*) from leads l where l.assigned_to = u.id and l.stage in ('quoted','negotiating'))::int as quotes,
          (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won,
          coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won'), 0)::bigint as revenue,
          coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won' and not l.commission_paid), 0)::bigint as "unpaidValue",
          (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${DAY})::int as "contactsToday",
          (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${WEEK})::int as "contactsWeek"
        from users u where u.role = 'rep' and u.is_active order by "contactsWeek" desc, u.display_name`),
      // Assigned leads nobody has touched for 3+ days (new, or last activity old).
      db.execute(sql`
        select b.id as "businessId", b.name, u.display_name as rep, u.phone as "repPhone", l.stage,
               coalesce((select max(a.created_at) from lead_activity a where a.lead_id = l.id and a.action <> 'assigned'), l.assigned_at) as "lastTouch"
        from leads l join businesses b on b.id = l.business_id join users u on u.id = l.assigned_to
        where l.stage not in ('won','lost')
          and coalesce((select max(a.created_at) from lead_activity a where a.lead_id = l.id and a.action <> 'assigned'), l.assigned_at) < now() - interval '3 days'
        order by "lastTouch" limit 30`),
      db.execute(sql`
        select (select count(*) from businesses)::int as businesses,
               (select count(*) from leads where assigned_to is null)::int as unassigned,
               coalesce((select sum(l.quote_amount) from leads l where l.stage in ('quoted','negotiating')), 0)::bigint as "quoteValue",
               (select count(*) from leads l where l.stage in ('quoted','negotiating'))::int as "quoteCount",
               coalesce((select sum(l.project_value) from leads l where l.stage = 'won' and coalesce(l.won_at, l.updated_at) >= ${MONTH}), 0)::bigint as "monthWon",
               (select count(*) from leads l where l.stage = 'won' and coalesce(l.won_at, l.updated_at) >= ${MONTH})::int as "monthWonCount",
               coalesce((select sum(l.project_value) from leads l where l.stage = 'won'), 0)::bigint as revenue,
               coalesce((select sum(l.project_value * coalesce(u.commission_pct, 0) / 100) from leads l join users u on u.id = l.assigned_to where l.stage = 'won' and not l.commission_paid), 0)::bigint as "commissionOwed",
               coalesce((select sum(l.project_value * coalesce(u.commission_pct, 0) / 100) from leads l join users u on u.id = l.assigned_to where l.stage = 'won' and l.commission_paid), 0)::bigint as "commissionPaid"`),
      db.execute(sql`select count(*)::int as n from lead_requests where status = 'pending'`),
      placesBudget(),
      db.execute(sql`
        select b.id as "businessId", b.name, u.display_name as rep, l.project_value as value, coalesce(u.commission_pct, 0) as pct,
               (l.project_value * coalesce(u.commission_pct, 0) / 100)::bigint as commission, l.commission_paid as paid, coalesce(l.won_at, l.updated_at) as "wonAt"
        from leads l join businesses b on b.id = l.business_id left join users u on u.id = l.assigned_to
        where l.stage = 'won' order by coalesce(l.won_at, l.updated_at) desc limit 50`),
    ]);

    return {
      funnel: funnel.rows,
      reps: nums(reps.rows as Row[], "revenue", "unpaidValue", "commissionPct"),
      stale: stale.rows,
      totals: nums(totals.rows as Row[], "quoteValue", "monthWon", "revenue", "commissionOwed", "commissionPaid")[0],
      pendingRequests: (requests.rows[0] as { n: number }).n,
      budget,
      deals: nums(deals.rows as Row[], "commission", "pct"),
    };
  },
  ["dashboard"],
  { revalidate: 60, tags: [LEADS_LIST_TAG] },
);

export async function GET() {
  const s = await requireSession(STAFF);
  if (s instanceof NextResponse) return s;
  return NextResponse.json(await load(pickTz()));
}
