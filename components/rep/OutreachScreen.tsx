"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, SkipForward, Pencil, Star, MapPin, PartyPopper } from "lucide-react";
import { useMyLeads } from "@/components/rep/TodayScreen";
import { Spinner } from "@/components/ui/primitives";
import { useMe } from "@/lib/hooks";
import { sendOrQueue } from "@/lib/offline";
import { firstPitch, pitchNicheId } from "@/lib/wapitch";
import { waNumber, whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/** Work the queue: one big button sends the niche-specific first WhatsApp, logs it, and shows the next lead. */
export function OutreachScreen() {
  const me = useMe();
  const { leads, isLoading, refresh } = useMyLeads();
  const [area, setArea] = React.useState("all");
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const [edit, setEdit] = React.useState<string | null>(null); // draft text while editing

  React.useEffect(() => {
    const a = new URLSearchParams(location.search).get("area");
    if (a) setArea(a);
  }, []);

  // New leads with a reachable number that we haven't messaged yet.
  const pool = leads.filter((l) => l.stage === "new" && waNumber(l) && !done.has(l.id));
  const areas = [...new Set(pool.map((l) => l.area ?? "No area"))];
  const inArea = pool.filter((l) => area === "all" || (l.area ?? "No area") === area);
  // skipped leads go to the back of the line
  const queue = [...inArea.filter((l) => !skipped.includes(l.id)), ...inArea.filter((l) => skipped.includes(l.id))];
  const cur = queue[0];

  const text = cur
    ? edit ??
      firstPitch({
        name: cur.name,
        category: cur.category,
        types: cur.types,
        area: cur.area,
        address: cur.address,
        rating: cur.rating,
        hasWebsite: cur.websiteStatus === "real",
        demoUrl: cur.siteSlug ? `${location.origin}/s/${cur.siteSlug}` : undefined,
        rep: me?.name ?? "our team",
      })
    : "";

  function send() {
    if (!cur) return;
    // open WhatsApp first, inside the tap, so the browser doesn't block it
    window.open(whatsappLink(waNumber(cur), text), "_blank", "noopener");
    const { id, name } = cur;
    setDone((d) => new Set(d).add(id));
    setEdit(null);
    sendOrQueue(`/api/my/leads/${id}`, "PATCH", { log: { action: "whatsapped", detail: "First pitch" } }).then((r) => {
      if (r === "rejected") alert(`WhatsApp opened for ${name}, but the send could not be saved.`);
      refresh();
    });
  }

  function skip() {
    if (!cur) return;
    setSkipped((s) => [...s.filter((x) => x !== cur.id), cur.id]);
    setEdit(null);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center pt-24 text-gray-300">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Outreach</h1>
        <p className="text-xs text-gray-500">
          {done.size} sent · {inArea.length} left
        </p>
      </header>

      {areas.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {["all", ...areas].map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", area === a ? "bg-accent text-white" : "bg-white text-gray-600 shadow-card")}
            >
              {a === "all" ? `All ${pool.length}` : `${a} ${pool.filter((l) => (l.area ?? "No area") === a).length}`}
            </button>
          ))}
        </div>
      )}

      {!cur ? (
        <div className="card space-y-2 rounded-2xl p-8 text-center shadow-card">
          <PartyPopper className="mx-auto text-accent" />
          <p className="text-sm font-semibold text-gray-900">{done.size ? "Queue finished!" : "No new leads to message"}</p>
          <p className="text-xs text-gray-500">
            {done.size ? `You sent ${done.size} first messages.` : "Select leads on the Leads screen and tap “Message these now”."}
          </p>
          <Link href="/rep/leads" className="inline-block pt-1 text-xs font-medium text-accent">
            Open my leads
          </Link>
        </div>
      ) : (
        <section className="card space-y-3 rounded-2xl p-4 shadow-card">
          <div>
            <Link href={`/rep/leads/${cur.id}`} className="text-lg font-semibold leading-tight text-gray-900">
              {cur.name}
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
              <span className="rounded-full bg-accent-wash px-2 py-0.5 font-medium capitalize text-accent">{pitchNicheId(cur)}</span>
              {cur.area && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin size={11} />
                  {cur.area}
                </span>
              )}
              {cur.rating != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Star size={11} className="fill-accent text-accent" />
                  {cur.rating.toFixed(1)} · {cur.reviewCount}
                </span>
              )}
            </p>
          </div>

          {edit === null ? (
            <button onClick={() => setEdit(text)} className="relative block w-full rounded-2xl bg-gray-50 p-3 text-left">
              <p className="whitespace-pre-line text-xs text-gray-700">{text}</p>
              <Pencil size={12} className="absolute right-3 top-3 text-gray-400" />
            </button>
          ) : (
            <textarea value={edit} onChange={(e) => setEdit(e.target.value)} rows={10} className="w-full rounded-2xl bg-gray-50 p-3 text-xs text-gray-700 outline-none" />
          )}

          <button onClick={send} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-semibold text-white active:scale-[0.99]">
            <MessageCircle size={20} /> Send on WhatsApp
          </button>
          <button onClick={skip} disabled={queue.length < 2} className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-medium text-gray-500 disabled:opacity-40">
            <SkipForward size={13} /> Skip for now
          </button>
        </section>
      )}
    </div>
  );
}
