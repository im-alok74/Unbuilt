"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, Phone, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type BusinessRow, type LeadStatus } from "@/lib/types";

const QUICK: LeadStatus[] = ["lost", "quoted", "won"];

export function MapPreviewCard({ business: b }: { business: BusinessRow }) {
  const { closePreview, openDetail, refreshAll } = useApp();
  const { push } = useToast();
  const router = useRouter();

  const [status, setStatus] = React.useState<LeadStatus>(b.leadStatus);
  const [pending, setPending] = React.useState<LeadStatus | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setStatus(b.leadStatus), [b.id, b.leadStatus]);

  async function setLead(next: LeadStatus) {
    const target = status === next ? "not_contacted" : next;
    setStatus(target);
    setPending(next);
    try {
      const res = await fetch(`/api/leads/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) throw new Error();
      refreshAll();
    } catch {
      setStatus(b.leadStatus);
      push("Couldn't update status", "error");
    } finally {
      setPending(null);
    }
  }

  async function copyPhone() {
    if (!b.phone) return;
    try {
      await navigator.clipboard.writeText(b.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      push("Couldn't copy", "error");
    }
  }

  function makeWebsite() {
    closePreview();
    router.push(`/build?lead=${b.id}${b.siteId ? "" : "&new=1"}`);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-3">
      <div className="card pointer-events-auto w-full max-w-md animate-slide-up rounded-3xl p-4 shadow-chrome">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => openDetail(b.id)}
            className="min-w-0 text-left"
          >
            <h3 className="truncate text-[15px] font-semibold leading-tight text-gray-900">
              {b.name}
            </h3>
            {(b.categoryLabel ?? b.category) && (
              <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {b.categoryLabel ?? b.category}
              </p>
            )}
          </button>
          <button
            onClick={closePreview}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          {b.address && (
            <p className="flex items-start gap-2 text-gray-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{b.address}</span>
            </p>
          )}
          {b.phone && (
            <p className="flex items-center gap-2 text-gray-600">
              <Phone size={14} className="shrink-0 text-gray-400" />
              <a href={`tel:${b.phone}`} className="hover:text-accent">
                {b.phone}
              </a>
              <button
                onClick={copyPhone}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Copy phone number"
              >
                {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
              </button>
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              b.hasWebsite ? "text-gray-500" : "text-pin-red",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                b.hasWebsite ? "bg-gray-400" : "bg-pin-red",
              )}
            />
            {b.hasWebsite ? "Has website" : "No website"}
          </span>
          {b.websiteRaw && (
            <a
              href={b.websiteRaw}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              View website <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {QUICK.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => setLead(s)}
                disabled={pending !== null}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full border text-xs font-medium transition disabled:opacity-60",
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50",
                )}
              >
                {pending === s ? <Spinner className="h-3.5 w-3.5" /> : LEAD_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>

        <button
          onClick={makeWebsite}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white shadow-sm transition hover:bg-accent-deep"
        >
          <Sparkles size={16} />
          {b.siteId ? "Open site builder" : "Make website"}
        </button>
      </div>
    </div>
  );
}
