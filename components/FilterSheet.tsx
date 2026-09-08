"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useApp, EMPTY_FILTERS } from "@/components/app-context";
import { Button } from "@/components/ui/primitives";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { humanizeType, cn } from "@/lib/utils";
import { useConfig } from "@/lib/hooks";

const STATUSES: LeadStatus[] = ["not_contacted", "quoted", "won", "lost"];

export function FilterSheet({
  open,
  onClose,
  knownCategories = [],
}: {
  open: boolean;
  onClose: () => void;
  knownCategories?: string[];
}) {
  const { filters, setFilters } = useApp();
  const { config } = useConfig();

  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>([
      ...(config?.priorityCategories ?? []),
      ...knownCategories,
    ]);
    return [...set].filter(Boolean).sort();
  }, [config?.priorityCategories, knownCategories]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[95] bg-black/50 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[96] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-28 shadow-chrome transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Filters</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Minimum score</span>
              <span className="text-xs tabular-nums text-accent">{filters.minScore}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minScore}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))
              }
              className="w-full accent-accent"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
            <span className="text-sm text-gray-800">No website only</span>
            <input
              type="checkbox"
              checked={filters.noWebsiteOnly}
              onChange={(e) =>
                setFilters((f) => ({ ...f, noWebsiteOnly: e.target.checked }))
              }
              className="h-4 w-4 accent-accent"
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-medium text-gray-600">Lead status</span>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const on = filters.status.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        status: on
                          ? f.status.filter((x) => x !== s)
                          : [...f.status, s],
                      }))
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      on ? "bg-accent text-white" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {LEAD_STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {categoryOptions.length > 0 && (
            <div>
              <span className="mb-2 block text-xs font-medium text-gray-600">Categories</span>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((c) => {
                  const on = filters.categories.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          categories: on
                            ? f.categories.filter((x) => x !== c)
                            : [...f.categories, c],
                        }))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium",
                        on ? "bg-accent text-white" : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {humanizeType(c)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              setFilters((f) => ({ ...EMPTY_FILTERS, search: f.search, sort: f.sort, dir: f.dir }))
            }
          >
            Reset
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Show results
          </Button>
        </div>
      </div>
    </>
  );
}
