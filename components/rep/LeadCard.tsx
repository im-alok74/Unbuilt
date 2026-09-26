"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Star,
  ExternalLink,
  CalendarClock,
  Check,
} from "lucide-react";
import { fetcher, useMe } from "@/lib/hooks";
import { sendOrQueue } from "@/lib/offline";
import { useToast } from "@/components/ui/toast";
import { PitchCard } from "@/components/PitchCard";
import { StageBadge } from "@/components/rep/LeadRow";
import { Badge, Button, Input, ScoreBadge, Spinner, Textarea } from "@/components/ui/primitives";
import { STAGES, STAGE_LABELS, type BusinessRow, type Stage } from "@/lib/types";
import { toWhatsappNumber, whatsappLink, directionsLink } from "@/lib/whatsapp";
import { timeAgo, cn } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  detail: string | null;
  at: string;
  by: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  called: "Called",
  whatsapped: "Sent WhatsApp",
  note: "Note",
  no_answer: "No answer",
  callback: "Asked to call back",
  not_interested: "Not interested",
  wrong_number: "Wrong number",
  dnc: "Do not contact",
  stage: "Stage",
  assigned: "Assigned",
  follow_up: "Follow-up set",
};

const OUTCOMES: { log: string; label: string; stage?: Stage }[] = [
  { log: "no_answer", label: "No answer" },
  { log: "callback", label: "Call back" },
  { log: "note", label: "Interested", stage: "contacted" },
  { log: "not_interested", label: "Not interested" },
  { log: "wrong_number", label: "Wrong number" },
];

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function atTen(daysAhead: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10, 0, 0, 0);
  return d;
}

export function LeadCard() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { push } = useToast();
  const key = `/api/my/leads/${id}`;
  const { data, isLoading } = useSWR<{ business: BusinessRow; activity: Activity[] }>(key, fetcher);
  const b = data?.business;

  const [notes, setNotes] = React.useState("");
  const [wonOpen, setWonOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [follow, setFollow] = React.useState("");

  React.useEffect(() => {
    if (b) {
      setNotes(b.notes);
      setFollow(b.nextFollowUp ? localInput(new Date(b.nextFollowUp)) : "");
    }
  }, [b?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(body: Record<string, unknown>, optimistic?: Partial<BusinessRow>) {
    if (optimistic && data) mutate(key, { ...data, business: { ...data.business, ...optimistic } }, false);
    const r = await sendOrQueue(key, "PATCH", body);
    if (r === "queued") push("Saved offline — will sync", "info");
    if (r === "rejected") push("Couldn't save that", "error");
    mutate(key);
    mutate("/api/my/leads");
    mutate("/api/my/summary");
    return r;
  }

  if (isLoading || !b) {
    return (
      <div className="flex justify-center pt-24 text-gray-300">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const wa = toWhatsappNumber(b.phone);
  const demo = b.siteSlug ? `${location.origin}/s/${b.siteSlug}` : "";
  const waMsg = [
    `Hi, this is ${me?.name ?? "a member of our team"} from Unbuilt. I came across ${b.name} on Google Maps${
      b.rating ? ` — ${b.rating}★ is great!` : "."
    }`,
    b.websiteStatus === "none" ? "I noticed you don't have a website yet, and I help local businesses get one." : "",
    demo ? `I made a quick preview for you: ${demo}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const touch = (action: string) => patch({ log: { action } });

  return (
    <div className="space-y-4 px-4 pb-6 pt-[max(16px,env(safe-area-inset-top))]">
      <Link href="/rep/leads" className="inline-flex items-center gap-1 text-xs text-gray-500">
        <ArrowLeft size={14} /> Leads
      </Link>

      <header className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-tight text-gray-900">{b.name}</h1>
          <ScoreBadge score={b.score} />
        </div>
        <p className="text-xs text-gray-500">{b.categoryLabel ?? b.category ?? "Business"}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <StageBadge stage={b.stage} />
          {b.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-gray-700 shadow-card">
              <Star size={11} className="fill-accent text-accent" />
              {b.rating.toFixed(1)} · {b.reviewCount}
            </span>
          )}
          {b.websiteStatus === "none" && <Badge tone="pink">No website</Badge>}
          {b.websiteStatus === "social" && <Badge tone="accent">Social only</Badge>}
          {b.websiteStatus === "real" && <Badge tone="green">Has website</Badge>}
        </div>
        {b.address && (
          <a
            href={directionsLink(b.lat, b.lng, b.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 text-xs text-gray-500"
          >
            <MapPin size={13} className="mt-0.5 shrink-0" /> {b.address}
          </a>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={b.phone ? `tel:${b.phone}` : undefined}
          onClick={() => b.phone && touch("called")}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-semibold text-white",
            !b.phone && "pointer-events-none opacity-40",
          )}
        >
          <Phone size={18} /> Call
        </a>
        <a
          href={wa ? whatsappLink(wa, waMsg) : undefined}
          target="_blank"
          rel="noreferrer"
          onClick={() => wa && touch("whatsapped")}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-semibold text-white",
            !wa && "pointer-events-none opacity-40",
          )}
        >
          <MessageCircle size={18} /> WhatsApp
        </a>
      </div>
      {b.phone && <p className="-mt-2 text-center text-xs text-gray-400">{b.phone}</p>}

      {b.pitchText ? (
        <PitchCard pitchText={b.pitchText} />
      ) : (
        <p className="rounded-2xl bg-white p-3 text-xs text-gray-400 shadow-card">
          No pitch written yet. Ask your manager to generate one.
        </p>
      )}

      {b.siteSlug && (
        <a
          href={`/s/${b.siteSlug}`}
          target="_blank"
          rel="noreferrer"
          className="card flex items-center justify-between rounded-2xl p-3.5 text-sm shadow-card"
        >
          <span>
            <span className="block font-medium text-gray-900">Demo site is ready</span>
            <span className="text-xs text-gray-500">Show it on the call or send it on WhatsApp</span>
          </span>
          <ExternalLink size={16} className="text-accent" />
        </a>
      )}

      <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">How did it go?</h2>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.log}
              onClick={() =>
                patch({ log: { action: o.log, detail: o.log === "note" ? "Interested" : undefined }, ...(o.stage && b.stage === "new" ? { stage: o.stage } : {}) })
              }
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-200"
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Stage</h2>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => (s === "won" ? setWonOpen(true) : patch({ stage: s }, { stage: s }))}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                b.stage === s ? "bg-accent text-white" : "bg-gray-100 text-gray-700",
              )}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
        {wonOpen && (
          <div className="flex gap-2 pt-1">
            <Input
              type="number"
              inputMode="numeric"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Project value (₹)"
            />
            <Button
              disabled={!Number(value)}
              onClick={async () => {
                const r = await patch({ stage: "won", projectValue: Number(value) }, { stage: "won" });
                if (r !== "rejected") {
                  setWonOpen(false);
                  push("Congrats — deal marked Won", "success");
                }
              }}
            >
              <Check size={16} />
            </Button>
          </div>
        )}
        {b.projectValue ? (
          <p className="text-xs text-gray-500">
            Project value ₹{b.projectValue.toLocaleString("en-IN")}
            {me ? ` · your commission ₹${Math.round((b.projectValue * me.commissionPct) / 100).toLocaleString("en-IN")}` : ""}
          </p>
        ) : null}
      </section>

      <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <CalendarClock size={13} /> Follow up
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            ["Tomorrow", 1],
            ["In 3 days", 3],
            ["Next week", 7],
          ].map(([label, days]) => (
            <button
              key={label as string}
              onClick={() => {
                const d = atTen(days as number);
                setFollow(localInput(d));
                patch({ nextFollowUp: d.toISOString() }, { nextFollowUp: d.toISOString() });
              }}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="datetime-local" value={follow} onChange={(e) => setFollow(e.target.value)} />
          <Button
            variant="subtle"
            disabled={!follow}
            onClick={() => patch({ nextFollowUp: new Date(follow).toISOString() })}
          >
            Set
          </Button>
        </div>
        {b.nextFollowUp && (
          <button
            onClick={() => {
              setFollow("");
              patch({ nextFollowUp: null }, { nextFollowUp: null });
            }}
            className="text-xs text-gray-400 underline"
          >
            Clear follow-up
          </button>
        )}
      </section>

      <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</h2>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== b.notes && patch({ notes })}
          placeholder="Owner name, what they said, best time to call…"
        />
      </section>

      {data && data.activity.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Activity</h2>
          <ul className="space-y-2">
            {data.activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="flex-1 text-gray-700">
                  <b className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</b>
                  {a.detail && a.action !== "assigned" ? ` — ${a.detail}` : ""}
                  <span className="block text-gray-400">
                    {a.by ?? "System"} · {timeAgo(a.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
