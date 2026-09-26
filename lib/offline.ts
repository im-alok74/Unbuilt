"use client";

// Rep updates made with no signal are queued in localStorage and replayed when the connection returns.
const KEY = "unbuilt.queue";

interface Queued {
  url: string;
  method: string;
  body: string;
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

/** Send a JSON mutation; on network failure, queue it. Returns "sent", "queued" or "rejected" (server said no). */
export async function sendOrQueue(url: string, method: string, payload: unknown): Promise<"sent" | "queued" | "rejected"> {
  const body = JSON.stringify(payload);
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
    return res.ok ? "sent" : "rejected";
  } catch {
    write([...read(), { url, method, body }]);
    return "queued";
  }
}

/** Replay queued mutations in order; stops at the first network failure. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  let sent = 0;
  for (const item of read()) {
    try {
      await fetch(item.url, { method: item.method, headers: { "Content-Type": "application/json" }, body: item.body });
    } catch {
      break;
    }
    write(read().slice(1));
    sent++;
  }
  return sent;
}
