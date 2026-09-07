"use client";

import * as React from "react";
import { Search, SlidersHorizontal, Download, ArrowUpDown, ExternalLink } from "lucide-react";
import { useBusinesses } from "@/lib/hooks";
import { useApp, filtersToQuery, activeFilterCount } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { FilterSheet } from "@/components/FilterSheet";
import { StatusControl } from "@/components/StatusControl";
import { ScoreBadge, Badge } from "@/components/ui/primitives";
import { SITE_STATUS_LABELS } from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

type SortKey = "score" | "name" | "rating" | "reviews" | "recent";

export function LeadsScreen() {
  const { filters, setFilters, openDetail, lastScanAt } = useApp();
  const { push } = useToast();
  const query = filtersToQuery(filters);
  const { businesses, isLoading, refresh } = useBusinesses(query);
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    refresh();
  }, [lastScanAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const nFilters = activeFilterCount(filters);

  function toggleSort(key: SortKey) {
    setFilters((f) => ({
      ...f,
      sort: key,
      dir: f.sort === key && f.dir === "desc" ? "asc" : "desc",
    }));
  }

  function exportCsv() {
    window.location.href = `/api/export?${query}`;
    push("Exporting current list…", "success");
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Business" },
    { key: "score", label: "Score" },
    { key: "rating", label: "Rating" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Leads</h1>
            <p className="text-xs text-white/45">
              {businesses.length} {businesses.length === 1 ? "business" : "businesses"}
              {nFilters > 0 && " · filtered"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="chrome relative grid h-10 w-10 place-items-center rounded-full text-accent"
            >
              <SlidersHorizontal size={16} />
              {nFilters > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink-950">
                  {nFilters}
                </span>
              )}
            </button>
            <button
              onClick={exportCsv}
              className="chrome grid h-10 w-10 place-items-center rounded-full text-accent"
            >
              <Download size={16} />
            </button>
          </div>
        </header>

        <div className="chrome mb-3 flex h-11 items-center rounded-full px-4">
          <Search size={16} className="mr-2 text-white/40" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search leads by name"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>

        {/* sort chips */}
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {cols.map((c) => (
            <button
              key={c.key}
              onClick={() => toggleSort(c.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                filters.sort === c.key
                  ? "bg-accent text-ink-950"
                  : "bg-white/8 text-white/60",
              )}
            >
              {c.label}
              {filters.sort === c.key && (
                <ArrowUpDown size={11} className={filters.dir === "asc" ? "rotate-180" : ""} />
              )}
            </button>
          ))}
        </div>

        {isLoading && businesses.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/40">Loading…</p>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-sm text-white/50">No leads yet.</p>
            <p className="mt-1 text-xs text-white/35">
              Go to the map, drop a pin, and run a scan.
            </p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-white/8 md:block">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs text-white/50">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Business</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Website</th>
                    <th className="px-3 py-2.5 font-medium">Rating</th>
                    <th className="px-3 py-2.5 font-medium">Reviews</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Site</th>
                    <th className="px-3 py-2.5 font-medium">Quote</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                      onClick={() => openDetail(b.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white">{b.name}</div>
                        <div className="text-xs text-white/40">
                          {b.categoryLabel ?? b.category}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <ScoreBadge score={b.score} />
                      </td>
                      <td className="px-3 py-2.5">
                        {b.websiteStatus === "real" ? (
                          <Badge tone="green">Yes</Badge>
                        ) : b.websiteStatus === "social" ? (
                          <Badge tone="accent">Social</Badge>
                        ) : (
                          <Badge tone="pink">No</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-white/70">
                        {b.rating?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-white/70">{b.reviewCount}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <StatusControl businessId={b.id} value={b.leadStatus} compact />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60">
                        {b.siteStatus ? SITE_STATUS_LABELS[b.siteStatus] : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-white/70">
                        {b.quotePrice ? formatINR(b.quotePrice) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-white/30">
                        <ExternalLink size={14} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="space-y-2 md:hidden">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openDetail(b.id)}
                  className="chrome flex w-full items-center gap-3 rounded-2xl p-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-white">{b.name}</span>
                      <ScoreBadge score={b.score} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/45">
                      <span>{b.categoryLabel ?? b.category}</span>
                      {b.rating != null && <span>· {b.rating.toFixed(1)}★ ({b.reviewCount})</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {b.websiteStatus === "real" ? (
                        <Badge tone="green">Has site</Badge>
                      ) : b.websiteStatus === "social" ? (
                        <Badge tone="accent">Social only</Badge>
                      ) : (
                        <Badge tone="pink">No website</Badge>
                      )}
                      {b.siteStatus && (
                        <Badge tone="blue">{SITE_STATUS_LABELS[b.siteStatus]}</Badge>
                      )}
                      {b.quotePrice ? (
                        <Badge tone="neutral">{formatINR(b.quotePrice)}</Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
