import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const DAY = sql`date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`;
const WEEK = sql`date_trunc('week', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`;

/** Contact counts, target progress, commission and the weekly leaderboard for the signed-in user. */
export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;

  const me = await db.execute(sql`
    select u.daily_target as "dailyTarget", u.commission_pct as "commissionPct",
      (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${DAY})::int as "contactsToday",
      (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${WEEK})::int as "contactsWeek",
      (select count(*) from leads l where l.assigned_to = u.id)::int as assigned,
      (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won,
      coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won'), 0)::int as "wonValue",
      coalesce((select sum(l.project_value) from leads l where l.assigned_to = u.id and l.stage = 'won' and l.commission_paid), 0)::int as "paidValue"
    from users u where u.id = ${s.userId}`);
  const r = me.rows[0] as Record<string, number>;

  const board = await db.execute(sql`
    select u.id, u.display_name as name,
      (select count(*) from lead_activity a where a.user_id = u.id and a.action in ('called','whatsapped') and a.created_at >= ${WEEK})::int as contacts,
      (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'won')::int as won
    from users u where u.role = 'rep' and u.is_active
    order by contacts desc, won desc limit 10`);

  const pct = r.commissionPct;
  return NextResponse.json({
    ...r,
    earned: Math.round((r.wonValue * pct) / 100),
    paid: Math.round((r.paidValue * pct) / 100),
    leaderboard: board.rows,
    me: s.userId,
  });
}
