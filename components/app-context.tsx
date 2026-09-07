"use client";

import * as React from "react";
import { mutate } from "swr";
import type { LeadStatus } from "@/lib/types";

export interface LeadFilters {
  minScore: number;
  categories: string[];
  noWebsiteOnly: boolean;
  status: LeadStatus[];
  search: string;
  sort: "score" | "name" | "rating" | "reviews" | "recent";
  dir: "asc" | "desc";
}

export const EMPTY_FILTERS: LeadFilters = {
  minScore: 0,
  categories: [],
  noWebsiteOnly: false,
  status: [],
  search: "",
  sort: "score",
  dir: "desc",
};

export function filtersToQuery(f: LeadFilters): string {
  const p = new URLSearchParams();
  if (f.minScore > 0) p.set("minScore", String(f.minScore));
  if (f.categories.length) p.set("categories", f.categories.join(","));
  if (f.noWebsiteOnly) p.set("noWebsiteOnly", "1");
  if (f.status.length) p.set("status", f.status.join(","));
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.sort !== "score") p.set("sort", f.sort);
  if (f.dir !== "desc") p.set("dir", f.dir);
  return p.toString();
}

export function activeFilterCount(f: LeadFilters): number {
  return (
    (f.minScore > 0 ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.noWebsiteOnly ? 1 : 0) +
    (f.status.length ? 1 : 0)
  );
}

interface AppState {
  detailId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  /** Revalidate every list/config query after a mutation. */
  refreshAll: () => void;
  /** Drop point shared between map sessions. */
  drop: { lat: number; lng: number } | null;
  setDrop: (p: { lat: number; lng: number } | null) => void;
  radiusM: number;
  setRadiusM: (m: number) => void;
  mapMode: "drop" | "scan" | "idle";
  setMapMode: (m: "drop" | "scan" | "idle") => void;
  lastScanAt: number;
  markScanned: () => void;
  filters: LeadFilters;
  setFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
}

const Ctx = React.createContext<AppState | null>(null);

export function useApp() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [drop, setDropState] = React.useState<{ lat: number; lng: number } | null>(null);
  const [radiusM, setRadiusM] = React.useState(1500);
  const [mapMode, setMapMode] = React.useState<"drop" | "scan" | "idle">("drop");
  const [lastScanAt, setLastScanAt] = React.useState(0);
  const [filters, setFilters] = React.useState<LeadFilters>(EMPTY_FILTERS);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("unbuilt.drop");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.lat === "number") setDropState(p);
      }
      const r = localStorage.getItem("unbuilt.radius");
      if (r) setRadiusM(Number(r));
    } catch {}
  }, []);

  const setDrop = React.useCallback((p: { lat: number; lng: number } | null) => {
    setDropState(p);
    try {
      if (p) localStorage.setItem("unbuilt.drop", JSON.stringify(p));
      else localStorage.removeItem("unbuilt.drop");
    } catch {}
  }, []);

  const setRadius = React.useCallback((m: number) => {
    setRadiusM(m);
    try {
      localStorage.setItem("unbuilt.radius", String(m));
    } catch {}
  }, []);

  const refreshAll = React.useCallback(() => {
    mutate((key) => typeof key === "string" && key.startsWith("/api/"), undefined, {
      revalidate: true,
    });
  }, []);

  const value: AppState = {
    detailId,
    openDetail: setDetailId,
    closeDetail: () => setDetailId(null),
    refreshAll,
    drop,
    setDrop,
    radiusM,
    setRadiusM: setRadius,
    mapMode,
    setMapMode,
    lastScanAt,
    markScanned: () => setLastScanAt(Date.now()),
    filters,
    setFilters,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
