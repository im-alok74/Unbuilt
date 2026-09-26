"use client";

import Link from "next/link";
import { Phone, ChevronRight, CalendarClock } from "lucide-react";
import { Badge, ScoreBadge } from "@/components/ui/primitives";
import { STAGE_LABELS, type BusinessRow, type Stage } from "@/lib/types";

const TONE: Record<Stage, "neutral" | "blue" | "purple" | "orange" | "green" | "red"> = {
  new: "neutral",
  contacted: "blue",
  demo_sent: "purple",
  quoted: "orange",
  negotiating: "orange",
  won: "green",
  lost: "red",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge tone={TONE[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

export function followUpLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return `Today ${t}`;
  if (days < 0) return `Overdue · ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ` ${t}`;
}

export function LeadRow({ b }: { b: BusinessRow }) {
  const fu = followUpLabel(b.nextFollowUp);
  const overdue = b.nextFollowUp && new Date(b.nextFollowUp).getTime() < Date.now() - 3600_000;
  return (
    <div className="card flex items-center gap-2 rounded-2xl pr-3.5 shadow-card">
      <Link href={`/rep/leads/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 pr-0 active:bg-gray-50">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-gray-900">{b.name}</p>
            <ScoreBadge score={b.score} />
          </div>
          <p className="truncate text-xs text-gray-500">
            {b.categoryLabel ?? b.category ?? "Business"}
            {b.address ? ` · ${b.address}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StageBadge stage={b.stage} />
            {fu && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${overdue ? "text-red-600" : "text-gray-500"}`}>
                <CalendarClock size={11} /> {fu}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="shrink-0 text-gray-300" />
      </Link>
      {b.phone && (
        <a
          href={`tel:${b.phone}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-wash text-accent"
          aria-label={`Call ${b.name}`}
        >
          <Phone size={16} />
        </a>
      )}
    </div>
  );
}
