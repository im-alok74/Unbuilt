"use client";

import * as React from "react";
import { Radar, MapPin, AlertTriangle, Check } from "lucide-react";
import { Button, Spinner } from "@/components/ui/primitives";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { useConfig } from "@/lib/hooks";
import type { ScanEstimate } from "@/lib/types";

export function ScanControls({
  mode,
  onScanned,
}: {
  mode: "drop" | "scan" | "idle";
  onScanned: () => void;
}) {
  const { drop, radiusM, setRadiusM, setMapMode, markScanned } = useApp();
  const { config, refresh: refreshConfig } = useConfig();
  const { push } = useToast();
  const [estimate, setEstimate] = React.useState<ScanEstimate | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{ n: number; nu: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/scan?radiusM=${radiusM}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setEstimate(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [radiusM]);

  async function runScan() {
    if (!drop) {
      push("Drop a pin first", "error");
      setMapMode("drop");
      return;
    }
    setScanning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: drop.lat, lng: drop.lng, radiusM }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "scan failed");
      setLastResult({ n: data.resultCount, nu: data.newCount });
      push(
        `${data.resultCount} businesses · ${data.newCount} new` +
          (data.mock ? " · demo data" : ` · ${data.apiCalls} API calls`),
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

  if (mode !== "drop" && mode !== "scan") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[70] flex justify-center px-3">
      <div className="chrome pointer-events-auto w-full max-w-md rounded-3xl p-4 shadow-chrome">
        {mode === "drop" ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
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
            <div className="mt-1 flex justify-between text-[10px] text-white/40">
              <span>0.5 km</span>
              <span>10 km</span>
            </div>
            <Button
              className="mt-3 w-full"
              disabled={!drop}
              onClick={() => setMapMode("scan")}
            >
              <Radar size={16} /> Continue to scan
            </Button>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-white">Scan this area</span>
              <button
                className="text-xs text-white/50 hover:text-white"
                onClick={() => setMapMode("drop")}
              >
                Adjust radius
              </button>
            </div>
            <p className="text-xs text-white/55">
              {(radiusM / 1000).toFixed(1)} km radius
              {estimate ? (
                <>
                  {" · "}
                  {estimate.mock
                    ? "demo mode (no API key yet)"
                    : `~${estimate.apiCalls} Places API call${estimate.apiCalls === 1 ? "" : "s"}`}
                </>
              ) : null}
            </p>

            {estimate && !estimate.mock && estimate.heavy && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Large area — this scan fans out into {estimate.tiles} sub-searches
                (~{estimate.apiCalls} calls). Shrink the radius to save quota.
              </div>
            )}

            {lastResult && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                <Check size={13} /> {lastResult.n} found, {lastResult.nu} new. Pins
                updated.
              </div>
            )}

            <Button className="mt-3 w-full" onClick={runScan} disabled={scanning || !drop}>
              {scanning ? (
                <>
                  <Spinner /> Scanning…
                </>
              ) : (
                <>
                  <Radar size={16} /> Run scan
                </>
              )}
            </Button>
            {config && !config.hasPlacesKey && (
              <p className="mt-2 text-center text-[10px] text-white/35">
                Add your Google Places key in the You tab for live data.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
