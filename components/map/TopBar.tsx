"use client";

import * as React from "react";
import { LocateFixed, Search, SlidersHorizontal, Download, Layers } from "lucide-react";
import { useApp, activeFilterCount } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function TopBar({
  count,
  onOpenFilter,
  onRecenter,
  onSearch,
  mapboxToken,
}: {
  count: number;
  onOpenFilter: () => void;
  onRecenter: () => void;
  onSearch: (q: string) => void;
  mapboxToken: string | null;
}) {
  const { filters, setFilters } = useApp();
  const { push } = useToast();
  const [q, setQ] = React.useState("");
  const nFilters = activeFilterCount(filters);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(q.trim());
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
    if (filters.categories.length) params.set("categories", filters.categories.join(","));
    if (filters.noWebsiteOnly) params.set("noWebsiteOnly", "1");
    if (filters.status.length) params.set("status", filters.status.join(","));
    if (filters.search) params.set("search", filters.search);
    window.location.href = `/api/export?${params.toString()}`;
    push("Exporting current list…", "success");
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] px-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button
          onClick={onRecenter}
          className="chrome pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent shadow-chrome"
          aria-label="Recenter"
        >
          <LocateFixed size={18} />
        </button>
        <button
          onClick={onOpenFilter}
          className="chrome pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-chrome"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,166,35,0.9), rgba(236,72,153,0.85))",
          }}
          aria-label="Quick filters"
        >
          <Layers size={17} className="text-ink-950" />
        </button>

        <form
          onSubmit={submit}
          className="chrome pointer-events-auto flex h-11 flex-1 items-center rounded-full px-4 shadow-chrome"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a business, address, or city"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button type="submit" aria-label="Search" className="text-white/60 hover:text-accent">
            <Search size={17} />
          </button>
        </form>

        <button
          onClick={onOpenFilter}
          className="chrome pointer-events-auto relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent shadow-chrome"
          aria-label="Filters"
        >
          <SlidersHorizontal size={17} />
          {nFilters > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink-950">
              {nFilters}
            </span>
          )}
        </button>
        <button
          onClick={exportCsv}
          className="chrome pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent shadow-chrome"
          aria-label="Export CSV"
        >
          <Download size={17} />
        </button>
      </div>

      <div className="mx-auto mt-2 flex max-w-2xl justify-end">
        <span className="chrome pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white/85 shadow-chrome">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {count} {count === 1 ? "lead" : "leads"}
        </span>
      </div>
    </div>
  );
}
