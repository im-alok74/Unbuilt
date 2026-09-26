import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifyUser, notifyStaff } from "@/lib/push";
import { placesBudget } from "@/lib/places";

export const dynamic = "force-dynamic";

/** Daily push digest, triggered by Vercel Cron (vercel.json). Authenticated with CRON_SECRET, not a user session. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const reps = await db.execute(sql`
    select u.id,
      (select count(*) from leads l where l.assigned_to = u.id and l.stage not in ('won','lost')
         and l.next_follow_up < date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' + interval '1 day')::int as due,
      (select count(*) from leads l where l.assigned_to = u.id and l.stage = 'new')::int as fresh
    from users u where u.role = 'rep' and u.is_active`);
  let sent = 0;
  for (const r of reps.rows as { id: string; due: number; fresh: number }[]) {
    if (r.due > 0) {
      await notifyUser(r.id, { title: "Follow-ups today", body: `${r.due} follow-up${r.due === 1 ? "" : "s"} due today`, url: "/rep" });
      sent++;
    } else if (r.fresh > 0) {
      await notifyUser(r.id, { title: "Leads waiting", body: `${r.fresh} new lead${r.fresh === 1 ? "" : "s"} to call`, url: "/rep" });
      sent++;
    }
  }

  const stale = await db.execute(sql`
    select count(*)::int as n from leads l
    where l.assigned_to is not null and l.stage not in ('won','lost')
      and coalesce((select max(a.created_at) from lead_activity a where a.lead_id = l.id and a.action <> 'assigned'), l.assigned_at) < now() - interval '3 days'`);
  const n = (stale.rows[0] as { n: number }).n;
  if (n > 0) await notifyStaff({ title: "Stale leads", body: `${n} lead${n === 1 ? "" : "s"} untouched for 3+ days`, url: "/team" });

  const b = await placesBudget();
  if (b.warn) await notifyStaff({ title: "Google budget", body: `${b.used}/${b.limit} Places calls used this month`, url: "/team" });

  return NextResponse.json({ ok: true, repsNotified: sent, stale: n });
}
