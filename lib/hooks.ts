"use client";

import useSWR from "swr";
import type { BusinessRow, ScoringWeights } from "@/lib/types";

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export interface ClientConfig {
  hasMapbox: boolean;
  mapboxToken: string | null;
  hasPlacesKey: boolean;
  hasLlmKey: boolean;
  llmProvider: string;
  priorityCategories: string[];
  scoringWeights: ScoringWeights;
  defaultQuoteMin: number;
  defaultQuoteMax: number;
  mock: boolean;
  counts: { total: number; won: number; contacted: number };
  usage: { totalCalls: number; liveCalls: number; scanCount: number };
}

export function useConfig() {
  const { data, error, isLoading, mutate } = useSWR<ClientConfig>(
    "/api/config",
    fetcher,
    { revalidateOnFocus: false },
  );
  return { config: data, error, isLoading, refresh: mutate };
}

export function useBusinesses(query: string) {
  const { data, error, isLoading, mutate } = useSWR<{ businesses: BusinessRow[] }>(
    `/api/businesses${query ? "?" + query : ""}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  return {
    businesses: data?.businesses ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}

export function useBusiness(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ business: BusinessRow }>(
    id ? `/api/businesses/${id}` : null,
    fetcher,
  );
  return { business: data?.business ?? null, error, isLoading, refresh: mutate };
}
