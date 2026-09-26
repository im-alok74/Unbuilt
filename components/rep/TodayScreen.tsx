"use client";

import * as React from "react";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { fetcher, useMe } from "@/lib/hooks";
import { LeadRow } from "@/components/rep/LeadRow";
import { Button, Spinner } from "@/components/ui/primitives";
import { enablePush, pushSupported, registerSW } from "@/lib/pushClient";
import type { BusinessRow } from "@/lib/types";

export interface Summary {
  dailyTarget: number;
  commissionPct: number;
  contactsToday: number;
  contactsWeek: number;
  assigned: number;
  won: number;
  wonValue: number;
  earned: number;
  paid: number;
  leaderboard: { id: string; name: string; contacts: number; won: number }[];
  me: string;
}

export function useMyLeads() {
  const { data, isLoading, mutate } = useSWR<{ businesses: BusinessRow[] }>("/api/my/leads", fetcher, {
    revalidateOnFocus: true,
  });
  return { leads: data?.businesses ?? [], isLoading, refresh: mutate };
}

export function useSummary() {
  return useSWR<Summary>("/api/my/summary", fetcher, { revalidateOnFocus: true });
}

function Ring({ value, max }: { value: number; max: number }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E7F7EF" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#12B76A"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center leading-none">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-400">of {max}</p>
      </div>
    </div>
  );
}

export function TodayScreen() {
  const me = useMe();
  const { leads, isLoading } = useMyLeads();
  const { data: sum } = useSummary();
  const [notif, setNotif] = React.useState<"hidden" | "ask" | "on">("hidden");

  React.useEffect(() => {
    registerSW();
    if (pushSupported() && Notification.permission === "default") setNotif("ask");
  }, []);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const due = open
    .filter((l) => l.nextFollowUp && new Date(l.nextFollowUp) <= endOfToday)
    .sort((a, b) => Date.parse(a.nextFollowUp!) - Date.parse(b.nextFollowUp!));
  const fresh = open.filter((l) => l.stage === "new").sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-5 px-4 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-xl font-semibold text-gray-900">Hi {me?.name?.split(" ")[0] ?? "there"}</h1>
      </header>

      {notif === "ask" && (
        <div className="flex items-center gap-3 rounded-2xl bg-accent-wash p-3.5">
          <Bell size={18} className="shrink-0 text-accent" />
          <p className="flex-1 text-xs text-gray-700">Get alerts for new leads and follow-ups.</p>
          <Button
            size="sm"
            onClick={async () => setNotif((await enablePush()) ? "on" : "hidden")}
          >
            Turn on
          </Button>
        </div>
      )}

      <section className="card flex items-center gap-4 rounded-2xl p-4 shadow-card">
        <Ring value={sum?.contactsToday ?? 0} max={sum?.dailyTarget ?? me?.dailyTarget ?? 15} />
        <div className="flex-1 space-y-1 text-sm">
          <p className="font-semibold text-gray-900">Today&apos;s contacts</p>
          <p className="text-xs text-gray-500">{sum?.contactsWeek ?? 0} this week · {sum?.won ?? 0} won</p>
          <p className="text-xs text-gray-500">{open.length} open leads</p>
        </div>
      </section>

      {isLoading && (
        <div className="flex justify-center py-8 text-gray-300">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {due.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Follow-ups due ({due.length})</h2>
          {due.map((b) => (
            <LeadRow key={b.id} b={b} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">New leads ({fresh.length})</h2>
        {fresh.slice(0, 10).map((b) => (
          <LeadRow key={b.id} b={b} />
        ))}
        {!isLoading && fresh.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-center text-xs text-gray-400">
            Nothing new. Ask your manager for more from the Request tab.
          </p>
        )}
      </section>
    </div>
  );
}
