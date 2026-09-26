"use client";

import * as React from "react";
import useSWR from "swr";
import { fetcher, useMe, useTeam, type TeamUser } from "@/lib/hooks";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, Field, Input, Select, Spinner } from "@/components/ui/primitives";
import { REQ_TONE, type LeadRequest } from "@/components/rep/RequestScreen";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

interface Dashboard {
  funnel: { stage: Stage; n: number }[];
  reps: { id: string; name: string; commissionPct: number; dailyTarget: number; assigned: number; worked: number; quotes: number; won: number; revenue: number; unpaidValue: number; contactsToday: number; contactsWeek: number }[];
  stale: { businessId: string; name: string; rep: string; stage: Stage; lastTouch: string }[];
  totals: { businesses: number; unassigned: number; revenue: number; commissionOwed: number; commissionPaid: number };
  pendingRequests: number;
  budget: { limit: number; used: number; remaining: number; warn: boolean; blocked: boolean };
  deals: { businessId: string; name: string; rep: string | null; value: number; pct: number; commission: number; paid: boolean; wonAt: string }[];
}

function Card({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "warn" }) {
  return (
    <div className="card rounded-2xl p-3.5 shadow-card">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className={cn("text-xl font-bold", tone === "warn" ? "text-amber-600" : "text-gray-900")}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Overview() {
  const me = useMe();
  const { openDetail } = useApp();
  const { push } = useToast();
  const { data: d, mutate } = useSWR<Dashboard>("/api/dashboard", fetcher, { refreshInterval: 300_000 });
  if (!d) return <Spinner className="mx-auto mt-16 text-gray-300" />;
  const max = Math.max(1, ...d.funnel.map((f) => f.n));
  const byStage = Object.fromEntries(d.funnel.map((f) => [f.stage, f.n]));
  const pct = Math.min(100, (d.budget.used / d.budget.limit) * 100);

  async function markPaid(id: string, paid: boolean) {
    const r = await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionPaid: paid }) });
    if (!r.ok) push("Only the admin can mark commission paid", "error");
    mutate();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Revenue won" value={inr(d.totals.revenue)} />
        <Card label="Commission owed" value={inr(d.totals.commissionOwed)} sub={`${inr(d.totals.commissionPaid)} paid`} />
        <Card label="Unassigned leads" value={d.totals.unassigned} sub={`${d.totals.businesses} total`} />
        <Card
          label="Google calls this month"
          value={`${d.budget.used}/${d.budget.limit}`}
          sub={d.budget.blocked ? "Scans blocked — reserve left" : d.budget.warn ? "Over 70% used" : `${d.budget.remaining} left`}
          tone={d.budget.warn ? "warn" : undefined}
        />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={cn("h-full", d.budget.warn ? "bg-amber-500" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>

      <section className="card space-y-2 rounded-2xl p-4 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900">Pipeline</h3>
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-gray-500">{STAGE_LABELS[s]}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={cn("h-full rounded-full", s === "won" ? "bg-accent" : s === "lost" ? "bg-red-300" : "bg-sky-300")} style={{ width: `${((byStage[s] ?? 0) / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-gray-700">{byStage[s] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className="card overflow-x-auto rounded-2xl shadow-card">
        <table className="w-full text-xs">
          <thead className="text-left text-gray-400">
            <tr>
              {["Rep", "Today", "Week", "Assigned", "Worked", "Quotes", "Won", "Revenue"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.reps.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                <td className={cn("px-3 py-2 tabular-nums", r.contactsToday < r.dailyTarget / 2 ? "text-amber-600" : "text-gray-700")}>{r.contactsToday}/{r.dailyTarget}</td>
                <td className="px-3 py-2 tabular-nums">{r.contactsWeek}</td>
                <td className="px-3 py-2 tabular-nums">{r.assigned}</td>
                <td className="px-3 py-2 tabular-nums">{r.worked}</td>
                <td className="px-3 py-2 tabular-nums">{r.quotes}</td>
                <td className="px-3 py-2 tabular-nums">{r.won}</td>
                <td className="px-3 py-2 tabular-nums">{inr(r.revenue)}</td>
              </tr>
            ))}
            {d.reps.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No reps yet. Add your team in the Reps tab.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {d.stale.length > 0 && (
        <section className="card space-y-1 rounded-2xl p-4 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900">Untouched for 3+ days ({d.stale.length})</h3>
          {d.stale.map((s) => (
            <button key={s.businessId} onClick={() => openDetail(s.businessId)} className="flex w-full items-center justify-between gap-2 border-t border-gray-100 py-2 text-left text-xs first:border-0">
              <span className="truncate font-medium text-gray-900">{s.name}</span>
              <span className="shrink-0 text-gray-400">{s.rep} · {timeAgo(s.lastTouch)}</span>
            </button>
          ))}
        </section>
      )}

      <section className="card space-y-1 rounded-2xl p-4 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900">Won deals &amp; commission</h3>
        {d.deals.length === 0 && <p className="py-4 text-center text-xs text-gray-400">No wins yet.</p>}
        {d.deals.map((x) => (
          <div key={x.businessId} className="flex items-center gap-2 border-t border-gray-100 py-2 text-xs first:border-0">
            <button onClick={() => openDetail(x.businessId)} className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium text-gray-900">{x.name}</p>
              <p className="text-gray-400">{x.rep ?? "—"} · {inr(x.value)} · {x.pct}%</p>
            </button>
            <span className="font-semibold text-gray-900">{inr(x.commission)}</span>
            {me?.role === "admin" ? (
              <Button size="sm" variant={x.paid ? "subtle" : "primary"} onClick={() => markPaid(x.businessId, !x.paid)}>
                {x.paid ? "Paid ✓" : "Mark paid"}
              </Button>
            ) : (
              <Badge tone={x.paid ? "green" : "orange"}>{x.paid ? "Paid" : "Owed"}</Badge>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function RepForm({ admin, onDone }: { admin: boolean; onDone: () => void }) {
  const { push } = useToast();
  const [f, setF] = React.useState({ displayName: "", username: "", password: "", phone: "", role: "rep", commissionPct: 10 });
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, phone: f.phone || undefined, commissionPct: admin ? f.commissionPct : undefined }),
    });
    const d = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return push(d?.error ?? "Couldn't add", "error");
    push(`${f.displayName} added. Share the username and password with them.`, "success");
    setF({ displayName: "", username: "", password: "", phone: "", role: "rep", commissionPct: 10 });
    onDone();
  }
  return (
    <form onSubmit={submit} className="card grid grid-cols-2 gap-3 rounded-2xl p-4 shadow-card">
      <h3 className="col-span-2 text-sm font-semibold text-gray-900">Add a team member</h3>
      <Field label="Full name"><Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></Field>
      <Field label="Username" hint="Lowercase, no spaces"><Input autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
      <Field label="Password" hint="6+ characters"><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="Phone"><Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      {admin && (
        <>
          <Field label="Role">
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="rep">Sales rep</option>
              <option value="manager">Manager</option>
            </Select>
          </Field>
          <Field label="Commission %" hint="10–20% of each delivered project">
            <Input type="number" min={10} max={20} value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: Number(e.target.value) })} />
          </Field>
        </>
      )}
      <Button type="submit" className="col-span-2" disabled={busy || !f.displayName || f.username.length < 3 || f.password.length < 6}>
        {busy ? <Spinner /> : "Add"}
      </Button>
    </form>
  );
}

function UserRow({ u, admin, onChanged }: { u: TeamUser; admin: boolean; onChanged: () => void }) {
  const { push } = useToast();
  const [target, setTarget] = React.useState(String(u.dailyTarget));
  const [pct, setPct] = React.useState(String(u.commissionPct));
  const [pw, setPw] = React.useState("");
  const [phone, setPhone] = React.useState(u.phone ?? "");
  async function patch(body: Record<string, unknown>, ok: string) {
    const r = await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => null);
    push(r.ok ? ok : (d?.error ?? "Couldn't save"), r.ok ? "success" : "error");
    if (r.ok) onChanged();
  }
  return (
    <details className={cn("card rounded-2xl shadow-card", !u.isActive && "opacity-60")}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {u.displayName} <span className="font-normal text-gray-400">@{u.username}</span>
          </p>
          <p className="text-xs text-gray-500">{u.assigned} leads · {u.won} won · {u.contactsToday} contacts today · {u.commissionPct}%</p>
        </div>
        {u.role !== "rep" && <Badge tone="purple">{u.role}</Badge>}
        {!u.isActive && <Badge tone="red">off</Badge>}
      </summary>
      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-3.5">
        <Field label="Daily contact target">
          <div className="flex gap-2">
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            <Button size="sm" variant="subtle" onClick={() => patch({ dailyTarget: Number(target) }, "Target saved")}>Save</Button>
          </div>
        </Field>
        {admin && (
          <Field label="Commission %">
            <div className="flex gap-2">
              <Input type="number" min={10} max={20} value={pct} onChange={(e) => setPct(e.target.value)} />
              <Button size="sm" variant="subtle" onClick={() => patch({ commissionPct: Number(pct) }, "Commission saved")}>Save</Button>
            </div>
          </Field>
        )}
        <Field label="Phone (for WhatsApp nudges)">
          <div className="flex gap-2">
            <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
            <Button size="sm" variant="subtle" onClick={() => patch({ phone: phone.trim() || null }, "Phone saved")}>Save</Button>
          </div>
        </Field>
        <Field label="Reset password">
          <div className="flex gap-2">
            <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
            <Button size="sm" variant="subtle" disabled={pw.length < 6} onClick={() => patch({ password: pw }, "Password reset").then(() => setPw(""))}>Set</Button>
          </div>
        </Field>
        <div className="flex items-end">
          <Button size="sm" variant={u.isActive ? "danger" : "primary"} onClick={() => patch({ isActive: !u.isActive }, u.isActive ? "Deactivated" : "Reactivated")}>
            {u.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </div>
    </details>
  );
}

function RepsTab() {
  const me = useMe();
  const { users, refresh } = useTeam();
  return (
    <div className="space-y-3">
      <RepForm admin={me?.role === "admin"} onDone={() => refresh()} />
      {users.filter((u) => u.id !== me?.id).map((u) => (
        <UserRow key={u.id} u={u} admin={me?.role === "admin"} onChanged={() => refresh()} />
      ))}
    </div>
  );
}

function RequestsTab() {
  const { push } = useToast();
  const { data, mutate } = useSWR<{ requests: LeadRequest[] }>("/api/requests", fetcher, { refreshInterval: 300_000 });
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  async function act(id: string, status: string) {
    const r = await fetch(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, managerNote: notes[id] || undefined }) });
    push(r.ok ? "Updated — the rep was notified" : "Couldn't update", r.ok ? "success" : "error");
    mutate();
  }
  if (!data) return <Spinner className="mx-auto mt-16 text-gray-300" />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Approve, then run the scan from the Drop tab (or import a sheet), assign the results in the Pool, and mark the request done.
      </p>
      {data.requests.map((r) => (
        <div key={r.id} className="card space-y-2 rounded-2xl p-3.5 text-sm shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900">{r.by} wants {r.quantity} × {r.niche}{r.area ? ` in ${r.area}` : ""}</p>
            <Badge tone={REQ_TONE[r.status]}>{r.status}</Badge>
          </div>
          <p className="text-xs text-gray-400">{timeAgo(r.createdAt)}</p>
          {(r.status === "pending" || r.status === "approved") && (
            <div className="flex flex-wrap gap-2">
              <Input className="flex-1" placeholder="Note to rep (optional)" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
              {r.status === "pending" && <Button size="sm" onClick={() => act(r.id, "approved")}>Approve</Button>}
              <Button size="sm" variant="subtle" onClick={() => act(r.id, "done")}>Mark done</Button>
              <Button size="sm" variant="ghost" onClick={() => act(r.id, "rejected")}>Decline</Button>
            </div>
          )}
        </div>
      ))}
      {data.requests.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No requests.</p>}
    </div>
  );
}

function DncTab() {
  const { push } = useToast();
  const { data, mutate } = useSWR<{ dnc: { phone: string; reason: string | null; createdAt: string }[] }>("/api/dnc", fetcher);
  const [phone, setPhone] = React.useState("");
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Numbers here are skipped by imports and assignment. Reps add to it automatically with “Wrong number”.</p>
      <div className="flex gap-2">
        <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
        <Button
          disabled={phone.replace(/\D/g, "").length < 10}
          onClick={async () => {
            const r = await fetch("/api/dnc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, reason: "manager" }) });
            push(r.ok ? "Added" : "Invalid number", r.ok ? "success" : "error");
            setPhone("");
            mutate();
          }}
        >
          Add
        </Button>
      </div>
      <div className="card divide-y divide-gray-100 rounded-2xl shadow-card">
        {data?.dnc.map((n) => (
          <div key={n.phone} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
            <span className="tabular-nums text-gray-900">{n.phone} <span className="text-xs text-gray-400">{n.reason}</span></span>
            <button className="text-xs text-gray-400 underline" onClick={async () => { await fetch(`/api/dnc?phone=${n.phone}`, { method: "DELETE" }); mutate(); }}>Remove</button>
          </div>
        ))}
        {data && data.dnc.length === 0 && <p className="py-8 text-center text-xs text-gray-400">Empty.</p>}
      </div>
    </div>
  );
}

const TABS = ["Overview", "Reps", "Requests", "Do not contact"] as const;

export function TeamScreen() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Overview");
  React.useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    const hit = TABS.find((x) => x.toLowerCase() === (t ?? "").toLowerCase());
    if (hit) setTab(hit);
  }, []);
  const { data } = useSWR<Dashboard>("/api/dashboard", fetcher);
  return (
    <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 text-xl font-semibold text-gray-900">Team</h1>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium", tab === t ? "bg-accent text-white" : "bg-gray-100 text-gray-600")}
            >
              {t}
              {t === "Requests" && !!data?.pendingRequests && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{data.pendingRequests}</span>
              )}
            </button>
          ))}
        </div>
        {tab === "Overview" && <Overview />}
        {tab === "Reps" && <RepsTab />}
        {tab === "Requests" && <RequestsTab />}
        {tab === "Do not contact" && <DncTab />}
      </div>
    </div>
  );
}
