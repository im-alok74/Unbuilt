"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Star,
  Globe,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { useBusiness } from "@/lib/hooks";
import { ScoreBreakdown } from "@/components/leads/ScoreBreakdown";
import { StatusControl } from "@/components/StatusControl";
import { Button, Badge, Spinner, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { SITE_STATUS_LABELS } from "@/lib/types";
import { formatINR, timeAgo } from "@/lib/utils";

export function DetailPanel() {
  const { detailId, closeDetail, refreshAll } = useApp();
  const { business: b, isLoading, refresh } = useBusiness(detailId);
  const router = useRouter();
  const { push } = useToast();
  const [notes, setNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [building, setBuilding] = React.useState(false);

  React.useEffect(() => {
    if (b) setNotes(b.notes);
  }, [b?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDetail();
    }
    if (detailId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, closeDetail]);

  const open = Boolean(detailId);

  async function saveNotes() {
    if (!b) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/leads/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      push("Notes saved", "success");
      refresh();
      refreshAll();
    } catch {
      push("Couldn't save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  async function buildSite() {
    if (!b) return;
    if (b.siteId) {
      router.push(`/build?lead=${b.id}`);
      closeDetail();
      return;
    }
    setBuilding(true);
    try {
      router.push(`/build?lead=${b.id}&new=1`);
      closeDetail();
    } finally {
      setBuilding(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDetail}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[101] w-full max-w-md overflow-y-auto bg-ink-950 shadow-chrome transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isLoading && !b && (
          <div className="flex h-full items-center justify-center text-white/50">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        {b && (
          <div className="space-y-5 p-5 pb-24">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold leading-tight text-white">{b.name}</h2>
                <p className="text-xs text-white/50">
                  {b.categoryLabel ?? b.category ?? "Business"}
                  {b.businessStatus && b.businessStatus !== "OPERATIONAL" && (
                    <span className="ml-2 text-red-300">
                      {b.businessStatus.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {b.stale && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <AlertTriangle size={13} />
                Data is over 30 days old — re-scan this area to refresh it.
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              {b.rating != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-white/80">
                  <Star size={12} className="fill-accent text-accent" />
                  {b.rating.toFixed(1)} · {b.reviewCount} reviews
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-white/80">
                {b.photoCount} photos
              </span>
              {b.websiteStatus === "none" && <Badge tone="pink">No website</Badge>}
              {b.websiteStatus === "social" && <Badge tone="accent">Social only</Badge>}
              {b.websiteStatus === "real" && <Badge tone="green">Has website</Badge>}
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <ScoreBreakdown score={b.score} factors={b.scoreBreakdown} />
            </div>

            <div className="space-y-2 text-sm">
              {b.address && (
                <p className="flex items-start gap-2 text-white/75">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-white/40" />
                  {b.address}
                </p>
              )}
              {b.phone && (
                <p className="flex items-center gap-2 text-white/75">
                  <Phone size={14} className="shrink-0 text-white/40" />
                  <a href={`tel:${b.phone}`} className="hover:text-accent">
                    {b.phone}
                  </a>
                </p>
              )}
              {b.websiteRaw && (
                <p className="flex items-center gap-2 text-white/75">
                  <Globe size={14} className="shrink-0 text-white/40" />
                  <a
                    href={b.websiteRaw}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-accent"
                  >
                    {b.websiteRaw.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
              {b.lat && b.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}&query_place_id=${b.placeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  Open in Google Maps <ExternalLink size={11} />
                </a>
              )}
            </div>

            {b.hours?.weekdayDescriptions?.length ? (
              <details className="rounded-xl bg-white/5 p-3 text-sm">
                <summary className="flex cursor-pointer items-center gap-2 text-white/70">
                  <Clock size={14} className="text-white/40" /> Opening hours
                </summary>
                <ul className="mt-2 space-y-0.5 text-xs text-white/60">
                  {b.hours.weekdayDescriptions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {b.photos.length > 0 && (
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                {b.photos.slice(0, 8).map((p, i) =>
                  p.uri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={p.uri}
                      alt=""
                      className="h-24 w-32 shrink-0 rounded-lg object-cover"
                    />
                  ) : null,
                )}
              </div>
            )}

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-white/60">Lead status</p>
                  <StatusControl businessId={b.id} value={b.leadStatus} onChanged={() => refresh()} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-white/60">Site</p>
                  <p className="flex h-9 items-center text-sm text-white/70">
                    {b.siteStatus ? (
                      <>
                        <span className="capitalize">{SITE_STATUS_LABELS[b.siteStatus]}</span>
                        {b.quotePrice ? (
                          <span className="ml-2 text-white/40">
                            {formatINR(b.quotePrice)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-white/35">Not built</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-white/60">Notes</p>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Quote sent, follow up Tuesday…"
                />
                {notes !== b.notes && (
                  <Button
                    size="sm"
                    variant="subtle"
                    className="mt-2"
                    onClick={saveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? <Spinner /> : "Save notes"}
                  </Button>
                )}
              </div>

              <Button className="w-full" onClick={buildSite} disabled={building}>
                <Sparkles size={16} />
                {b.siteId ? "Open site builder" : "Build a site for this lead"}
              </Button>
            </div>

            <p className="text-center text-[10px] text-white/30">
              Last scanned {timeAgo(b.lastScannedAt)} · {b.placeId.startsWith("mock_") ? "demo data" : "Google Places"}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
