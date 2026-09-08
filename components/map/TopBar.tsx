"use client";

import * as React from "react";
import { LocateFixed, Search, SlidersHorizontal, Download, MapPin } from "lucide-react";
import { useApp, activeFilterCount } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";

export function TopBar({
  count,
  onOpenFilter,
  onRecenter,
  onSearch,
  onToggleKey,
}: {
  count: number;
  onOpenFilter: () => void;
  onRecenter: () => void;
  onSearch: (q: string) => void;
  onToggleKey: () => void;
}) {
  const { filters } = useApp();
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

  const iconBtn =
    "chrome pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-700 shadow-chrome hover:text-accent";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] px-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button onClick={onRecenter} className={iconBtn} aria-label="Recenter">
          <LocateFixed size={18} className="text-accent" />
        </button>
        <button
          onClick={onToggleKey}
          className="chrome pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-chrome"
          style={{
            background: "linear-gradient(135deg,#12B76A 0%,#8AD97F 45%,#F79009 100%)",
          }}
          aria-label="Map key"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
        </button>

        <form
          onSubmit={submit}
          className="chrome pointer-events-auto flex h-11 flex-1 items-center rounded-full px-4 shadow-chrome"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a business, address, or city"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button type="submit" aria-label="Search" className="text-gray-400 hover:text-accent">
            <Search size={17} />
          </button>
        </form>

        <button onClick={onOpenFilter} className={`${iconBtn} relative`} aria-label="Filters">
          <SlidersHorizontal size={17} />
          {nFilters > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {nFilters}
            </span>
          )}
        </button>
        <button onClick={exportCsv} className={iconBtn} aria-label="Export CSV">
          <Download size={17} />
        </button>
      </div>

      <div className="mx-auto mt-2 flex max-w-2xl justify-end">
        <span className="chrome pointer-events-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-chrome">
          <MapPin size={12} className="text-accent" />
          {count}
        </span>
      </div>
    </div>
  );
}
