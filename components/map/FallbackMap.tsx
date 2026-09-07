"use client";

import * as React from "react";
import type { BusinessRow } from "@/lib/types";
import { pinBucket } from "@/lib/scoring/score";
import { truncate } from "@/lib/utils";

interface Props {
  businesses: BusinessRow[];
  drop: { lat: number; lng: number } | null;
  radiusM: number;
  mode: "drop" | "scan" | "idle";
  onDrop: (p: { lat: number; lng: number }) => void;
  onPick: (id: string) => void;
  recenterSignal: number;
}

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

export function FallbackMap({
  businesses,
  drop,
  radiusM,
  mode,
  onDrop,
  onPick,
  recenterSignal,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [view, setView] = React.useState(drop ?? DEFAULT_CENTER);

  React.useEffect(() => {
    if (drop) setView(drop);
  }, [drop?.lat, drop?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (drop) setView({ ...drop });
  }, [recenterSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const minDim = Math.min(size.w, size.h) || 400;
  // Fit ~1.6x the scan radius across the smaller viewport dimension.
  const mPerPx = (radiusM * 3.2) / minDim;
  const latPerM = 1 / 111_320;
  const lngPerM = 1 / (111_320 * Math.cos((view.lat * Math.PI) / 180));

  function project(lat: number, lng: number) {
    const dxM = (lng - view.lng) / lngPerM;
    const dyM = (lat - view.lat) / latPerM;
    return { x: size.w / 2 + dxM / mPerPx, y: size.h / 2 - dyM / mPerPx };
  }
  function unproject(x: number, y: number) {
    const dxM = (x - size.w / 2) * mPerPx;
    const dyM = -(y - size.h / 2) * mPerPx;
    return { lat: view.lat + dyM * latPerM, lng: view.lng + dxM * lngPerM };
  }

  function handleClick(e: React.MouseEvent) {
    if (mode !== "drop") return;
    const rect = ref.current!.getBoundingClientRect();
    const p = unproject(e.clientX - rect.left, e.clientY - rect.top);
    onDrop(p);
  }

  const center = project(view.lat, view.lng);
  const radiusPx = radiusM / mPerPx;
  const dropPt = drop ? project(drop.lat, drop.lng) : null;

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`absolute inset-0 overflow-hidden ${mode === "drop" ? "cursor-crosshair" : ""}`}
      style={{
        background:
          "radial-gradient(1200px 600px at 50% 20%, #1a1f27 0%, #0b0d10 70%)",
      }}
    >
      {/* grid */}
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.28 }}>
        <defs>
          <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#39414d" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
        {dropPt && (
          <>
            <circle
              cx={dropPt.x}
              cy={dropPt.y}
              r={radiusPx}
              fill="rgba(245,166,35,0.06)"
              stroke="rgba(245,166,35,0.5)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </>
        )}
      </svg>

      {/* pins */}
      {businesses.map((b) => {
        if (b.lat == null || b.lng == null) return null;
        const p = project(b.lat, b.lng);
        if (p.x < -40 || p.x > size.w + 40 || p.y < -40 || p.y > size.h + 40) return null;
        const bucket = pinBucket(b.score, b.leadStatus, b.siteStatus);
        const color =
          bucket === "pink" ? "#EC4899" : bucket === "amber" ? "#F5A623" : "#3FB65B";
        return (
          <button
            key={b.id}
            onClick={(e) => {
              e.stopPropagation();
              onPick(b.id);
            }}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: p.x, top: p.y }}
          >
            <span
              className="block h-3 w-3 rounded-full ring-2 ring-black/40"
              style={{
                background: color,
                boxShadow: bucket !== "green" ? `0 0 0 5px ${color}22` : undefined,
              }}
            />
            <span className="map-pin-label absolute left-4 top-1/2 -translate-y-1/2 text-white/85 group-hover:text-white">
              {truncate(b.name, 6)}
            </span>
          </button>
        );
      })}

      {/* drop marker */}
      {dropPt && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: dropPt.x, top: dropPt.y }}
        >
          <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
            <path
              d="M13 0C6 0 1 5 1 12c0 8 12 18 12 18s12-10 12-18C25 5 20 0 13 0Z"
              fill="#3B82F6"
              stroke="#0b0d10"
              strokeWidth="1.5"
            />
            <circle cx="13" cy="12" r="4" fill="#fff" />
          </svg>
        </div>
      )}

      {!drop && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6 text-center">
          <p className="chrome rounded-2xl px-4 py-3 text-sm text-white/70">
            Tap anywhere to drop a pin, then set a radius and scan.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] text-white/30">
        schematic map · add a Mapbox token in You for the real 3D map
      </div>
    </div>
  );
}
