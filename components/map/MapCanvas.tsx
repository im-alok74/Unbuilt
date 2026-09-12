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

function toFeatureCollection(businesses: BusinessRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: businesses
      .filter((b) => b.lat != null && b.lng != null)
      .map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.lng as number, b.lat as number] },
        properties: {
          id: b.id,
          name: truncate(b.name, 6),
          color: PIN_HEX[pinColor(b.websiteStatus, b.leadStatus)],
        },
      })),
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
        map.addSource("businesses", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 45,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "businesses",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ACCENT,
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              14,
              25,
              18,
              100,
              22,
              750,
              28,
            ],
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "businesses",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
          },
          paint: { "text-color": "#fff" },
        });
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "businesses",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 6.5,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        });
        map.addLayer({
          id: "unclustered-label",
          type: "symbol",
          source: "businesses",
          filter: ["!", ["has", "point_count"]],
          minzoom: 13,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-anchor": "left",
            "text-offset": [1, 0],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          },
        });

        map.on("click", "clusters", (e) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id;
          const source = map.getSource("businesses") as import("mapbox-gl").GeoJSONSource;
          if (clusterId == null || !feature) return;
          if (feature.geometry.type !== "Point") return;
          const [lng, lat] = feature.geometry.coordinates;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !map || zoom == null) return;
            map.easeTo({ center: [lng, lat], zoom });
          });
        });
        map.on("click", "unclustered-point", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) onPickRef.current(id);
        });
        for (const layer of ["clusters", "unclustered-point"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "crosshair";
          });
        }

        map.getCanvas().style.cursor = "crosshair";
        setReady(true);
      });

      map.on("click", (e) => {
        if (map.getLayer("clusters")) {
          const hits = map.queryRenderedFeatures(e.point, {
            layers: ["clusters", "unclustered-point"],
          });
          if (hits.length > 0) return; // handled by the layer-specific click listeners above
        }
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

  // business pins: one GPU-rendered clustered layer instead of a DOM marker per
  // lead, since thousands of individual mapbox Markers makes panning/zooming unusable.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("businesses") as import("mapbox-gl").GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(businesses));
  }, [businesses, ready]);

  // Outer wrapper keeps sizing: mapbox-gl.css forces `position: relative` on its
  // container, which would collapse `absolute inset-0`.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
