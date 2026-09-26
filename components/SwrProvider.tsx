"use client";

import { SWRConfig } from "swr";

// Cache is saved on the phone (localStorage): panels open instantly, even offline. Cleared on login/logout.
// Repeat opens within 60s do not hit the DB; writes call mutate(), so edits still show at once.
function provider() {
  let map = new Map<string, unknown>();
  if (typeof window === "undefined") return map as Map<string, never>; // server prerender
  try {
    map = new Map(JSON.parse(localStorage.getItem("swr-cache") || "[]"));
  } catch {}
  const save = () => {
    try {
      localStorage.setItem("swr-cache", JSON.stringify([...map.entries()]));
    } catch {}
  };
  addEventListener("pagehide", save);
  addEventListener("visibilitychange", () => document.visibilityState === "hidden" && save());
  return map as Map<string, never>;
}

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider, dedupingInterval: 60_000, revalidateOnFocus: false, revalidateOnReconnect: false }}>
      {children}
    </SWRConfig>
  );
}
