"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  MapPin,
  Upload,
  UserPlus,
  Sparkles,
  Bug,
  MessageCircle,
  ChevronRight,
  Users,
  Inbox,
  Wallet,
  PhoneCall,
  FileText,
  Trophy,
} from "lucide-react";
import { fetcher, useMe } from "@/lib/hooks";
import { Spinner } from "@/components/ui/primitives";
import { toWhatsappNumber, whatsappLink } from "@/lib/whatsapp";
import { inr } from "@/lib/packages";
import { timeAgo, cn } from "@/lib/utils";

interface Rep {
  id: string;
  name: string;
  phone: string | null;
  dailyTarget: number;
  contactsToday: number;
  contactsWeek: number;
  assigned: number;
  won: number;
}
interface Home {
  reps: Rep[];
  stale: { businessId: string; name: string; rep: string; repPhone: string | null; lastTouch: string }[];
  totals: { unassigned: number; quoteValue: number; quoteCount: number; monthWon: number; monthWonCount: number; commissionOwed: number };
  pendingRequests: number;
  budget: { used: number; limit: number; warn: boolean; blocked: boolean };
}

function Tile({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card rounded-2xl p-3.5 shadow-card">
      <Icon size={16} className="mb-1.5 text-accent" />
      <p className="text-xl font-bold leading-tight text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function Action({
  icon: Icon,
  tone = "accent",
  title,
  body,
  href,
  cta,
}: {
  icon: React.ElementType;
  tone?: "accent" | "amber" | "red";
  title: string;
  body?: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 rounded-2xl p-3.5 shadow-card active:bg-gray-50">
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          tone === "accent" && "bg-accent-wash text-accent",
          tone === "amber" && "bg-amber-50 text-amber-600",
          tone === "red" && "bg-red-50 text-red-600",
        )}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        {body && <span className="block text-xs text-gray-500">{body}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-accent">
        {cta} <ChevronRight size={14} />
      </span>
    </Link>
  );
}

function nudgeLink(phone: string | null, text: string) {
  const n = toWhatsappNumber(phone);
  return n ? whatsappLink(n, text) : "";
}

export function HomeScreen() {
  const me = useMe();
  const { data: d } = useSWR<Home>("/api/dashboard", fetcher, { refreshInterval: 300_000 });
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!d) {
    return (
      <div className="flex min-h-[100dvh] justify-center pt-32 text-gray-300">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const callsToday = d.reps.reduce((n, r) => n + r.contactsToday, 0);
  const target = d.reps.reduce((n, r) => n + r.dailyTarget, 0);
  // Only call it "not started" after 11am, so nobody is nagged at 9.
  const notStarted = hour >= 11 ? d.reps.filter((r) => r.contactsToday === 0) : [];

  const actions: React.ReactNode[] = [];
  if (d.reps.length === 0) {
    actions.push(
      <Action key="addrep" icon={UserPlus} tone="amber" title="Add your first sales rep" body="They get a login and see only their own leads." href="/team?tab=Reps" cta="Add" />,
    );
  }
  if (d.totals.unassigned > 0 && d.reps.length > 0) {
    actions.push(
      <Action
        key="unassigned"
        icon={Users}
        tone="amber"
        title={`${d.totals.unassigned} leads are waiting for a rep`}
        body="Tick them and choose who calls them."
        href="/pool?assigned=unassigned"
        cta="Give out"
      />,
    );
  }
  if (d.pendingRequests > 0) {
    actions.push(
      <Action
        key="req"
        icon={Inbox}
        tone="amber"
        title={`${d.pendingRequests} rep${d.pendingRequests === 1 ? "" : "s"} asked for more leads`}
        body="Say yes or no, they get a notification."
        href="/team?tab=Requests"
        cta="Reply"
      />,
    );
  }
  if (d.totals.commissionOwed > 0) {
    actions.push(
      <Action key="pay" icon={Wallet} title={`${inr(d.totals.commissionOwed)} commission to pay`} body="From deals that are won." href="/team" cta="See" />,
    );
  }
  if (d.budget.blocked || d.budget.warn) {
    actions.push(
      <Action
        key="budget"
        icon={MapPin}
        tone={d.budget.blocked ? "red" : "amber"}
        title={d.budget.blocked ? "Google searches used up for this month" : "Google searches running low"}
        body={`${d.budget.used} of ${d.budget.limit} used. Use Excel upload for more leads.`}
        href="/pool?import=1"
        cta="Upload"
      />,
    );
  }

  return (
    <div className="min-h-[100dvh] px-4 pb-32 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {greet}, {me?.name?.split(" ")[0] ?? "there"}
          </h1>
        </header>

        <section className="grid grid-cols-3 gap-3">
          <Tile icon={PhoneCall} label="Calls today" value={`${callsToday}/${target || "-"}`} sub="team total" />
          <Tile icon={FileText} label="Quotes waiting" value={inr(d.totals.quoteValue)} sub={`${d.totals.quoteCount} client${d.totals.quoteCount === 1 ? "" : "s"}`} />
          <Tile icon={Trophy} label="Won this month" value={inr(d.totals.monthWon)} sub={`${d.totals.monthWonCount} deal${d.totals.monthWonCount === 1 ? "" : "s"}`} />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Needs you today</h2>
          {actions.length ? actions : (
            <div className="card rounded-2xl bg-accent-wash p-4 text-sm text-accent-deep shadow-card">All good. Nothing needs your attention right now.</div>
          )}
        </section>

        {notStarted.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Haven&apos;t started calling yet</h2>
            <div className="card divide-y divide-gray-100 rounded-2xl shadow-card">
              {notStarted.map((r) => {
                const link = nudgeLink(r.phone, `Hi ${r.name.split(" ")[0]}, how is your day going? Your target today is ${r.dailyTarget} calls. Let me know if you need any leads or help.`);
                return (
                  <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex-1 text-sm text-gray-900">{r.name}</span>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white">
                        <MessageCircle size={13} /> Nudge
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400">no phone saved</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {d.stale.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Leads going cold</h2>
            <p className="-mt-1 text-xs text-gray-500">Nobody has called these for 3 or more days.</p>
            <div className="card divide-y divide-gray-100 rounded-2xl shadow-card">
              {d.stale.slice(0, 5).map((s) => {
                const link = nudgeLink(s.repPhone, `Hi ${s.rep.split(" ")[0]}, please follow up with ${s.name}. It has been a few days since anyone called.`);
                return (
                  <div key={s.businessId} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-900">{s.name}</span>
                      <span className="block text-[11px] text-gray-400">
                        {s.rep} · last touched {timeAgo(s.lastTouch)}
                      </span>
                    </span>
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white">
                        <MessageCircle size={13} /> Remind
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {d.reps.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Your team today</h2>
            <div className="card divide-y divide-gray-100 rounded-2xl shadow-card">
              {d.reps.map((r) => {
                const pct = Math.min(100, Math.round((r.contactsToday / Math.max(1, r.dailyTarget)) * 100));
                return (
                  <div key={r.id} className="px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-gray-900">{r.name}</span>
                      <span className="text-xs text-gray-500">
                        {r.contactsToday} of {r.dailyTarget} calls · {r.won} won
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={cn("h-full rounded-full", pct >= 70 ? "bg-accent" : pct >= 30 ? "bg-amber-400" : "bg-red-300")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/map", icon: MapPin, label: "Find new leads", sub: "Search an area on the map" },
              { href: "/pool?import=1", icon: Upload, label: "Upload an Excel", sub: "Add many leads at once" },
              { href: "/pool?add=1", icon: UserPlus, label: "Add one lead", sub: "Type it in yourself" },
              { href: "/build", icon: Sparkles, label: "Make a demo website", sub: "Show a client a preview" },
              { href: "/issues", icon: Bug, label: "Report a problem", sub: "Something not working?" },
              { href: "/sites", icon: FileText, label: "Demo websites", sub: "Sites you have made" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="card rounded-2xl p-3.5 shadow-card active:bg-gray-50">
                <a.icon size={20} className="mb-1.5 text-accent" />
                <span className="block text-sm font-semibold text-gray-900">{a.label}</span>
                <span className="block text-[11px] text-gray-500">{a.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
