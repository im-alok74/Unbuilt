"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useMyLeads } from "@/components/rep/TodayScreen";
import { LeadRow } from "@/components/rep/LeadRow";
import { Input, Select, Spinner } from "@/components/ui/primitives";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeadsList() {
  const { leads, isLoading } = useMyLeads();
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState<Stage | "all">("all");
  const [sort, setSort] = React.useState<"followup" | "score" | "recent">("followup");

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l) => (c[l.stage] = (c[l.stage] ?? 0) + 1));
    return c;
  }, [leads]);

  const list = leads
    .filter((l) => (stage === "all" || l.stage === stage) && (!q || l.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      if (sort === "score") return b.score - a.score;
      if (sort === "recent") return Date.parse(b.lastScannedAt) - Date.parse(a.lastScannedAt);
      const fa = a.nextFollowUp ? Date.parse(a.nextFollowUp) : Infinity;
      const fb = b.nextFollowUp ? Date.parse(b.nextFollowUp) : Infinity;
      return fa - fb || b.score - a.score;
    });

  return (
    <div className="space-y-3 px-4 pt-[max(20px,env(safe-area-inset-top))]">
      <h1 className="text-xl font-semibold text-gray-900">My leads</h1>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" className="pl-9" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-28">
          <option value="followup">Follow-up</option>
          <option value="score">Score</option>
          <option value="recent">Newest</option>
        </Select>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {(["all", ...STAGES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              stage === s ? "bg-accent text-white" : "bg-white text-gray-600 shadow-card",
            )}
          >
            {s === "all" ? `All ${leads.length}` : `${STAGE_LABELS[s]} ${counts[s] ?? 0}`}
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="flex justify-center py-8 text-gray-300">
          <Spinner className="h-6 w-6" />
        </div>
      )}
      <div className="space-y-2">
        {list.map((b) => (
          <LeadRow key={b.id} b={b} />
        ))}
        {!isLoading && list.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">No leads here.</p>
        )}
      </div>
    </div>
  );
}
