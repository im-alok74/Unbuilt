"use client";

import { SWRConfig } from "swr";

// Cache is saved on the phone (localStorage): panels open instantly, even offline. Cleared on login/logout.
// Repeat opens within 10s do not hit the DB; writes call mutate(), so edits still show at once.
function provider() {
  let map = new Map<string, unknown>();
  if (typeof window === "undefined") return map as Map<string, never>; // server prerender
  try {
    map = new Map(JSON.parse(localStorage.getItem("swr-cache") || "[]"));
  } catch {}
  // Only small per-user keys are persisted; big lists (/api/businesses*) are not.
  const keep = (k: string) => k.startsWith("/api/my/") || k.startsWith("/api/me") || k.startsWith("/api/config");
  let last = 0;
  const save = () => {
    const now = Date.now();
    if (now - last < 5000) return;
    last = now;
    try {
      const s = JSON.stringify([...map.entries()].filter(([k]) => keep(String(k))));
      if (s.length <= 400_000) localStorage.setItem("swr-cache", s);
    } catch {}
  };
  addEventListener("pagehide", save);
  addEventListener("visibilitychange", () => document.visibilityState === "hidden" && save());
  return map as Map<string, never>;
}

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider, dedupingInterval: 10_000, revalidateOnFocus: false, revalidateOnReconnect: false }}>
      {children}
    </SWRConfig>
  );
}
