"use client";

import type { ScoreFactor } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreBreakdown({
  score,
  factors,
}: {
  score: number;
  factors: ScoreFactor[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-white">{score}%</span>
        <span className="text-xs text-white/50">opportunity score</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            score >= 70 ? "bg-pink-400" : score >= 40 ? "bg-accent" : "bg-emerald-400",
          )}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      {factors.length === 0 ? (
        <p className="pt-1 text-xs text-white/45">
          No opportunity signals — this business looks well set up already.
        </p>
      ) : (
        <ul className="space-y-1.5 pt-1">
          {factors.map((f) => (
            <li
              key={f.key}
              className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-white">{f.label}</p>
                <p className="text-[11px] leading-snug text-white/50">{f.detail}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-soft">
                +{f.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
