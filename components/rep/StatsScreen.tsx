"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Trophy, Bug } from "lucide-react";
import { useSummary } from "@/components/rep/TodayScreen";
import { useMe } from "@/lib/hooks";
import { Button, Input, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card rounded-2xl p-3.5 shadow-card">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

export function StatsScreen() {
  const { data: s } = useSummary();
  const me = useMe();
  const router = useRouter();
  const { push } = useToast();
  const [pw, setPw] = React.useState("");

  async function signOut() {
    await fetch("/api/lock", { method: "POST" });
    try { localStorage.removeItem("swr-cache"); } catch {}
    router.replace("/login");
  }

  if (!s) {
    return (
      <div className="flex justify-center pt-24 text-gray-300">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">{me?.name ?? "My stats"}</h1>
        <p className="text-xs text-gray-400">Commission rate {s.commissionPct}% of each delivered project</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Contacts today" value={`${s.contactsToday}/${s.dailyTarget}`} />
        <Stat label="Contacts this week" value={s.contactsWeek} />
        <Stat label="Leads assigned" value={s.assigned} />
        <Stat label="Deals won" value={s.won} sub={s.wonValue ? inr(s.wonValue) + " billed" : undefined} />
      </div>

      <section className="rounded-2xl bg-accent p-4 text-white shadow-card">
        <p className="text-xs opacity-80">Commission earned</p>
        <p className="text-3xl font-bold">{inr(s.earned)}</p>
        <p className="text-xs opacity-80">{inr(s.paid)} paid · {inr(s.earned - s.paid)} pending</p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Trophy size={15} className="text-amber-500" /> This week
        </h2>
        <ol className="card divide-y divide-gray-100 rounded-2xl shadow-card">
          {s.leaderboard.map((r, i) => (
            <li key={r.id} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-sm", r.id === s.me && "bg-accent-wash")}>
              <span className="w-5 text-center text-xs font-bold text-gray-400">{i + 1}</span>
              <span className="flex-1 truncate font-medium text-gray-900">{r.name}</span>
              <span className="text-xs text-gray-500">{r.contacts} contacts · {r.won} won</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Account</h2>
        <div className="flex gap-2">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (6+ chars)" />
          <Button
            variant="subtle"
            disabled={pw.length < 6}
            onClick={async () => {
              const r = await fetch("/api/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: pw }),
              });
              push(r.ok ? "Password updated" : "Couldn't update", r.ok ? "success" : "error");
              if (r.ok) setPw("");
            }}
          >
            Change
          </Button>
        </div>
        <Link href="/rep/issues" className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-gray-300 text-sm font-medium text-gray-800">
          <Bug size={15} /> Report a problem
        </Link>
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut size={15} /> Sign out
        </Button>
      </section>
    </div>
  );
}
