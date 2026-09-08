"use client";

import * as React from "react";
import { Radar, MapPin, AlertTriangle, Check } from "lucide-react";
import { Button, Spinner } from "@/components/ui/primitives";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { useConfig } from "@/lib/hooks";
import type { ScanEstimate } from "@/lib/types";

export function ScanControls({ onScanned }: { onScanned: () => void }) {
  const { drop, radiusM, setRadiusM, markScanned } = useApp();
  const { config, refresh: refreshConfig } = useConfig();
  const { push } = useToast();
  const [estimate, setEstimate] = React.useState<ScanEstimate | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [allTypes, setAllTypes] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{ n: number; nu: number } | null>(null);

  React.useEffect(() => {
    try {
      setAllTypes(localStorage.getItem("unbuilt.scanAll") === "1");
    } catch {}
  }, []);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/scan?radiusM=${radiusM}`)
      .then((r) => r.json())
      .then((d) => alive && setEstimate(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [radiusM]);

  async function runScan() {
    if (!drop) {
      push("Tap the map to drop a pin first", "error");
      return;
    }
    setScanning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: drop.lat, lng: drop.lng, radiusM, allBusinesses: allTypes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "scan failed");
      setLastResult({ n: data.resultCount, nu: data.newCount });
      push(
        `${data.resultCount} businesses · ${data.newCount} new` +
          (data.mock ? " · demo data" : ` · ${data.apiCalls} API call${data.apiCalls === 1 ? "" : "s"}`),
        "success",
      );
      markScanned();
      onScanned();
      refreshConfig();
    } catch (e) {
      push(e instanceof Error ? e.message : "Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[70] flex justify-center px-3">
      <div className="chrome pointer-events-auto w-full max-w-md rounded-3xl p-4 shadow-chrome">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <MapPin size={15} className="text-accent" />
            {drop ? "Scan radius" : "Tap the map to drop a pin"}
          </span>
          <span className="text-sm tabular-nums text-accent">
            {(radiusM / 1000).toFixed(1)} km
          </span>
        </div>
        <input
          type="range"
          min={500}
          max={10000}
          step={100}
          value={radiusM}
          disabled={!drop}
          onChange={(e) => setRadiusM(Number(e.target.value))}
          className="w-full accent-accent disabled:opacity-40"
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>0.5 km</span>
          <span>
            {estimate
              ? estimate.mock
                ? "demo mode"
                : `~${estimate.apiCalls} API call${estimate.apiCalls === 1 ? "" : "s"}`
              : ""}
          </span>
          <span>10 km</span>
        </div>

        {estimate && !estimate.mock && (
          <div
            className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
              estimate.heavy ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"
            }`}
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {estimate.apiCalls === 1 ? (
              "1 Places call — a quick look, ~20 businesses."
            ) : (
              <>
                Thorough sweep: {estimate.tiles} overlapping searches (~
                {estimate.apiCalls} Places calls) to catch the small independent
                businesses, not just the big chains. Shrink the radius for fewer calls.
              </>
            )}
          </div>
        )}

        <label className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
          <span>
            Include every business type
            <span className="ml-1 text-gray-400">(not just your priority list)</span>
          </span>
          <input
            type="checkbox"
            checked={allTypes}
            onChange={(e) => {
              setAllTypes(e.target.checked);
              try {
                localStorage.setItem("unbuilt.scanAll", e.target.checked ? "1" : "0");
              } catch {}
            }}
            className="h-4 w-4 accent-accent"
          />
        </label>

        {lastResult && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
            <Check size={13} /> {lastResult.n} found, {lastResult.nu} new — all saved.
          </div>
        )}

        <Button className="mt-3 w-full" onClick={runScan} disabled={scanning || !drop}>
          {scanning ? (
            <>
              <Spinner /> Scanning…
            </>
          ) : (
            <>
              <Radar size={16} /> Scan this area
            </>
          )}
        </Button>
        {config && !config.hasPlacesKey && (
          <p className="mt-2 text-center text-[10px] text-gray-400">
            Add your Google Places key in You for live data.
          </p>
        )}
      </div>
    </div>
  );
}
