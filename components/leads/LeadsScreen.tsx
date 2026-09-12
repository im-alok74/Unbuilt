"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useBusinesses } from "@/lib/hooks";
import { useApp, filtersToQuery, activeFilterCount } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { FilterSheet } from "@/components/FilterSheet";
import { StatusControl } from "@/components/StatusControl";
import { ScoreBadge, Badge } from "@/components/ui/primitives";
import { SITE_STATUS_LABELS } from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

type SortKey = "score" | "name" | "rating" | "reviews" | "recent";

const PAGE_SIZE = 50;

export function LeadsScreen() {
  const { filters, setFilters, openDetail, lastScanAt } = useApp();
  const { push } = useToast();
  const [page, setPage] = React.useState(1);
  const baseQuery = filtersToQuery(filters);
  const query = `${baseQuery ? baseQuery + "&" : ""}page=${page}&pageSize=${PAGE_SIZE}`;
  const { businesses, total, isLoading, refresh } = useBusinesses(query);
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    refresh();
  }, [lastScanAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Any change to filters/sort invalidates the current page's result set.
  React.useEffect(() => {
    setPage(1);
  }, [baseQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  // A mutation (e.g. status change) can shrink the filtered total out from under the current page.
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
            <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
            <p className="text-xs text-gray-400">
              {total} {total === 1 ? "business" : "businesses"}
              {nFilters > 0 && " · filtered"}
              {total > 0 && ` · showing ${rangeStart}–${rangeEnd}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="chrome relative grid h-10 w-10 place-items-center rounded-full text-accent"
            >
              <SlidersHorizontal size={16} />
              {nFilters > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
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
          <Search size={16} className="mr-2 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search leads by name"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-600",
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
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <p className="text-sm text-gray-400">No leads yet.</p>
            <p className="mt-1 text-xs text-gray-300">
              Go to the map, drop a pin, and run a scan.
            </p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-400">
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
                      className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                      onClick={() => openDetail(b.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">
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
                      <td className="px-3 py-2.5 tabular-nums text-gray-600">
                        {b.rating?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-600">{b.reviewCount}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <StatusControl businessId={b.id} value={b.leadStatus} compact />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {b.siteStatus ? SITE_STATUS_LABELS[b.siteStatus] : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-600">
                        {b.quotePrice ? formatINR(b.quotePrice) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-300">
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
                      <span className="truncate font-medium text-gray-900">{b.name}</span>
                      <ScoreBadge score={b.score} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
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

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="chrome flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-gray-600 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="chrome flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-gray-600 disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
