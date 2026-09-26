import "server-only";
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubs, users } from "@/lib/db/schema";

let ready: boolean | null = null;
function init(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  return (ready = true);
}

/** Best-effort Web Push to every device a user has registered. Never throws. */
export async function notifyUser(userId: string, msg: { title: string; body: string; url?: string }) {
  try {
    if (!init()) return;
    const subs = await db.select().from(pushSubs).where(eq(pushSubs.userId, userId));
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(msg),
          );
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.delete(pushSubs).where(eq(pushSubs.endpoint, s.endpoint));
        }
      }),
    );
  } catch {
    /* notifications are never worth failing a request over */
  }
}

export async function notifyStaff(msg: { title: string; body: string; url?: string }) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.role, ["manager", "admin"]), eq(users.isActive, true)));
  await Promise.all(rows.map((r) => notifyUser(r.id, msg)));
}
