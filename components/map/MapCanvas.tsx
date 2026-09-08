"use client";

import * as React from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";
import type { BusinessRow } from "@/lib/types";
import { pinColor, PIN_HEX } from "@/lib/scoring/score";
import { truncate } from "@/lib/utils";

interface Props {
  token: string;
  businesses: BusinessRow[];
  drop: { lat: number; lng: number } | null;
  radiusM: number;
  onDrop: (p: { lat: number; lng: number }) => void;
  onPick: (id: string) => void;
  recenterSignal: number;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
}

const DEFAULT_CENTER: [number, number] = [77.209, 28.6139];
const ACCENT = "#12B76A";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

function circlePolygon(lat: number, lng: number, radiusM: number) {
  const points = 64;
  const coords: [number, number][] = [];
  const latR = radiusM / 110574;
  const lngR = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    coords.push([lng + lngR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

export function MapCanvas({
  token,
  businesses,
  drop,
  radiusM,
  onDrop,
  onPick,
  recenterSignal,
  flyTo,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MbMap | null>(null);
  const markersRef = React.useRef<Map<string, MbMarker>>(new Map());
  const dropMarkerRef = React.useRef<MbMarker | null>(null);
  const onDropRef = React.useRef(onDrop);
  const onPickRef = React.useRef(onPick);
  const [ready, setReady] = React.useState(false);

  onDropRef.current = onDrop;
  onPickRef.current = onPick;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: drop ? [drop.lng, drop.lat] : DEFAULT_CENTER,
        zoom: drop ? 14.8 : 11,
        pitch: 55,
        bearing: -17,
        antialias: true,
        attributionControl: true,
      });
      mapRef.current = map;

      map.on("style.load", () => {
        const layers = map.getStyle().layers ?? [];
        const labelLayer = layers.find(
          (l) => l.type === "symbol" && (l.layout as { "text-field"?: unknown })?.["text-field"],
        );
        if (!map.getLayer("3d-buildings")) {
          map.addLayer(
            {
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13,
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "height"],
                  0,
                  "#EDE7DA",
                  40,
                  "#E3DACA",
                  140,
                  "#D8CCB8",
                ],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.92,
              },
            },
            labelLayer?.id,
          );
        }

        map.addSource("scan-radius", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "scan-radius-fill",
          type: "fill",
          source: "scan-radius",
          paint: { "fill-color": ACCENT, "fill-opacity": 0.07 },
        });
        map.addLayer({
          id: "scan-radius-line",
          type: "line",
          source: "scan-radius",
          paint: {
            "line-color": ACCENT,
            "line-width": 1.5,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
        });
        map.getCanvas().style.cursor = "crosshair";
        setReady(true);
      });

      map.on("click", (e) => {
        onDropRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // drop marker + radius
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (drop) {
        const el = document.createElement("div");
        el.innerHTML =
          '<svg width="26" height="30" viewBox="0 0 26 30" fill="none"><path d="M13 0C6 0 1 5 1 12c0 8 12 18 12 18s12-10 12-18C25 5 20 0 13 0Z" fill="#2E90FA" stroke="#fff" stroke-width="1.5"/><circle cx="13" cy="12" r="4" fill="#fff"/></svg>';
        if (!dropMarkerRef.current) {
          dropMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([drop.lng, drop.lat])
            .addTo(map);
        } else {
          dropMarkerRef.current.setLngLat([drop.lng, drop.lat]);
        }
      } else if (dropMarkerRef.current) {
        dropMarkerRef.current.remove();
        dropMarkerRef.current = null;
      }

      const src = map.getSource("scan-radius") as { setData: (d: unknown) => void } | undefined;
      src?.setData(
        drop
          ? { type: "FeatureCollection", features: [circlePolygon(drop.lat, drop.lng, radiusM)] }
          : { type: "FeatureCollection", features: [] },
      );
    })();
  }, [drop?.lat, drop?.lng, radiusM, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const target = flyTo ?? drop;
    if (target) {
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: flyTo?.zoom ?? 14.8,
        pitch: 55,
        duration: 900,
      });
    }
  }, [recenterSignal, flyTo?.lat, flyTo?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // business markers
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      const seen = new Set<string>();
      for (const b of businesses) {
        if (b.lat == null || b.lng == null) continue;
        seen.add(b.id);
        const color = PIN_HEX[pinColor(b.websiteStatus, b.leadStatus)];
        let marker = markersRef.current.get(b.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "group relative block";
          el.style.transform = "translate(-50%,-50%)";
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            onPickRef.current(b.id);
          });
          marker = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([b.lng, b.lat]);
          marker.addTo(map);
          markersRef.current.set(b.id, marker);
        } else {
          marker.setLngLat([b.lng, b.lat]);
        }
        marker.getElement().innerHTML = `
          <span style="display:block;width:13px;height:13px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px #fff,0 1px 4px rgba(0,0,0,0.25)"></span>
          <span class="map-pin-label" style="position:absolute;left:17px;top:50%;transform:translateY(-50%)">${esc(
            truncate(b.name, 6),
          )}</span>`;
      }
      for (const [id, marker] of markersRef.current) {
        if (!seen.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    })();
  }, [businesses, ready]);

  // Outer wrapper keeps sizing: mapbox-gl.css forces `position: relative` on its
  // container, which would collapse `absolute inset-0`.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
