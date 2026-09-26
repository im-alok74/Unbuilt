"use client";

import * as React from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, Field, Input, Spinner } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export interface LeadRequest {
  id: string;
  niche: string;
  area: string | null;
  quantity: number;
  status: "pending" | "approved" | "done" | "rejected";
  managerNote: string | null;
  createdAt: string;
  by: string;
}

export const REQ_TONE = { pending: "orange", approved: "blue", done: "green", rejected: "red" } as const;

export function RequestScreen() {
  const { push } = useToast();
  const { data, isLoading, mutate } = useSWR<{ requests: LeadRequest[] }>("/api/requests", fetcher);
  const [niche, setNiche] = React.useState("");
  const [area, setArea] = React.useState("");
  const [qty, setQty] = React.useState("20");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche, area, quantity: Number(qty) || 20 }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      push("Request sent to your manager", "success");
      setNiche("");
      setArea("");
      mutate();
    } else {
      const d = await res?.json().catch(() => null);
      push(d?.error ?? "Couldn't send request", "error");
    }
  }

  return (
    <div className="space-y-5 px-4 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Request leads</h1>
        <p className="text-xs text-gray-400">Tell your manager what to find. You&apos;ll get a notification when it&apos;s ready.</p>
      </header>

      <form onSubmit={submit} className="card space-y-3 rounded-2xl p-4 shadow-card">
        <Field label="What kind of business?">
          <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Gyms, salons, restaurants…" />
        </Field>
        <Field label="Where?">
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area or neighbourhood" />
        </Field>
        <Field label="How many?">
          <Input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || niche.trim().length < 2}>
          {busy ? <Spinner /> : "Send request"}
        </Button>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Your requests</h2>
        {isLoading && <Spinner className="mx-auto text-gray-300" />}
        {data?.requests.map((r) => (
          <div key={r.id} className="card rounded-2xl p-3.5 text-sm shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-900">
                {r.quantity} × {r.niche}
              </p>
              <Badge tone={REQ_TONE[r.status]}>{r.status}</Badge>
            </div>
            <p className="text-xs text-gray-500">
              {r.area ? `${r.area} · ` : ""}
              {timeAgo(r.createdAt)}
            </p>
            {r.managerNote && <p className="mt-1 text-xs text-gray-600">“{r.managerNote}”</p>}
          </div>
        ))}
        {data && data.requests.length === 0 && <p className="text-center text-xs text-gray-400">No requests yet.</p>}
      </section>
    </div>
  );
}
