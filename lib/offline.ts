"use client";

// Rep updates made with no signal are queued in localStorage and replayed when the connection returns.
const KEY = "unbuilt.queue";

interface Queued {
  url: string;
  method: string;
  body: string;
  /** Idempotency key; absent on items queued by older builds. */
  key?: string;
}

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(q: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {}
}

export function pendingCount(): number {
  return read().length;
}

/**
 * Send a JSON mutation; on network failure, queue it. Returns "sent", "queued" or "rejected" (server said no).
 * The Idempotency-Key header is sent for the future; the server currently ignores it, so a replay after a
 * lost response can still apply twice (the PATCH payloads here are mostly idempotent).
 */
export async function sendOrQueue(url: string, method: string, payload: unknown): Promise<"sent" | "queued" | "rejected"> {
  const body = JSON.stringify(payload);
  const key = crypto.randomUUID();
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body });
    return res.ok ? "sent" : "rejected";
  } catch {
    write([...read(), { url, method, body, key }]);
    return "queued";
  }
}

let flushing = false;

async function flushOnce(): Promise<number> {
  // Backfill keys on items queued by older builds so they can be removed by identity.
  const q = read();
  if (q.some((i) => !i.key)) write(q.map((i) => ({ ...i, key: i.key ?? crypto.randomUUID() })));
  let sent = 0;
  for (const item of read()) {
    let res: Response;
    try {
      res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json", "Idempotency-Key": item.key as string },
        body: item.body,
      });
    } catch {
      break; // offline: keep it and retry later
    }
    // Drop on success or a permanent 4xx; keep and stop on 5xx / 401 (signed out) / 429 (slow down).
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429;
    if (!res.ok && !permanent) break;
    write(read().filter((i) => i.key !== item.key));
    if (res.ok) sent++;
  }
  return sent;
}

/** Replay queued mutations in order; stops at the first network/server failure. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    // Cross-tab guard; ifAvailable skips instead of queueing a second flush behind the first.
    const r = await navigator.locks.request("unbuilt-flush", { ifAvailable: true }, (lock) => (lock ? flushOnce() : 0));
    return r;
  }
  if (flushing) return 0;
  flushing = true;
  try {
    return await flushOnce();
  } finally {
    flushing = false;
  }
}
