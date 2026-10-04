import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { LEADS_LIST_TAG } from "@/lib/cache";
import { pickTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const dayOf = (tz: string) => sql`date_trunc('day', now() at time zone ${tz}::text) at time zone ${tz}::text`;
const weekOf = (tz: string) => sql`date_trunc('week', now() at time zone ${tz}::text) at time zone ${tz}::text`;

// Identical for every rep, so cache it (per timezone, since the week boundary moves with it).
const leaderboard = unstable_cache(
  async (tz: string) => {
    const board = await db.execute(sql`
      select u.id, u.display_name as name,
        (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${weekOf(tz)})::int as contacts,
        (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won
      from users u where u.role = 'rep' and u.is_active
      order by contacts desc, won desc limit 10`);
    return board.rows;
  },
  ["my-summary-board"],
  { revalidate: 60, tags: [LEADS_LIST_TAG] },
);

/** Contact counts, target progress, commission and the weekly leaderboard for the signed-in user. */
export async function GET(req: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const tz = pickTz(req.headers.get("x-tz"));

  const me = await db.execute(sql`
    select u.daily_target as "dailyTarget", coalesce(u.commission_pct, 0) as "commissionPct",
      (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${dayOf(tz)})::int as "contactsToday",
      (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${weekOf(tz)})::int as "contactsWeek",
      (select count(*) from leads l where l.assigned_to = u.id)::int as assigned,
      (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won,
      coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won'), 0)::bigint as "wonValue",
      coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won' and l.commission_paid), 0)::bigint as "paidValue"
    from users u where u.id = ${s.userId}`);
  const r = me.rows[0] as Record<string, number | string>;
  const wonValue = Number(r.wonValue ?? 0);
  const paidValue = Number(r.paidValue ?? 0);
  const pct = Number(r.commissionPct ?? 0);

  return NextResponse.json({
    ...r,
    commissionPct: pct,
    wonValue,
    paidValue,
    earned: Math.round((wonValue * pct) / 100),
    paid: Math.round((paidValue * pct) / 100),
    leaderboard: await leaderboard(tz),
    me: s.userId,
  });
}
