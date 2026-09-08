"use client";

import * as React from "react";
import { useConfig, useBusinesses } from "@/lib/hooks";
import { useApp, filtersToQuery } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { MapCanvas } from "@/components/map/MapCanvas";
import { FallbackMap } from "@/components/map/FallbackMap";
import { TopBar } from "@/components/map/TopBar";
import { FilterSheet } from "@/components/FilterSheet";
import { ScanControls } from "@/components/map/ScanControls";
import { MapKey, useMapKey } from "@/components/map/MapKey";

export function MapScreen() {
  const { config } = useConfig();
  const { filters, drop, radiusM, setDrop, openDetail, lastScanAt } = useApp();
  const { push } = useToast();
  const query = filtersToQuery(filters);
  const { businesses, refresh } = useBusinesses(query);
  const mapKey = useMapKey();

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [recenter, setRecenter] = React.useState(0);
  const [flyTo, setFlyTo] = React.useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  React.useEffect(() => {
    refresh();
  }, [lastScanAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const knownCategories = React.useMemo(
    () => [...new Set(businesses.map((b) => b.category).filter(Boolean) as string[])],
    [businesses],
  );

  function locate() {
    if (drop) setRecenter((n) => n + 1);
    if (!navigator.geolocation) {
      push("Geolocation not available", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDrop(p);
        setFlyTo({ ...p, zoom: 14.6 });
        setRecenter((n) => n + 1);
      },
      () => push("Couldn't get your location", "error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function onSearch(q: string) {
    if (!q) return;
    const match = businesses.find((b) => b.name.toLowerCase().includes(q.toLowerCase()));
    if (match) {
      openDetail(match.id);
      if (match.lat && match.lng) {
        setFlyTo({ lat: match.lat, lng: match.lng, zoom: 16 });
        setRecenter((n) => n + 1);
      }
      return;
    }
    if (!config?.mapboxToken) {
      push("No name match. Add a Mapbox token for address search.", "info");
      return;
    }
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        q,
      )}.json?access_token=${config.mapboxToken}&limit=1`;
      const r = await fetch(url);
      const d = await r.json();
      const feat = d.features?.[0];
      if (!feat) {
        push("Nothing found for that search", "info");
        return;
      }
      const [lng, lat] = feat.center;
      setDrop({ lat, lng });
      setFlyTo({ lat, lng, zoom: 14.5 });
      setRecenter((n) => n + 1);
      push(`Moved to ${feat.text}`, "success");
    } catch {
      push("Search failed", "error");
    }
  }

  return (
    <div className="fixed inset-0">
      {config?.mapboxToken ? (
        <MapCanvas
          token={config.mapboxToken}
          businesses={businesses}
          drop={drop}
          radiusM={radiusM}
          onDrop={(p) => setDrop(p)}
          onPick={openDetail}
          recenterSignal={recenter}
          flyTo={flyTo}
        />
      ) : (
        <FallbackMap
          businesses={businesses}
          drop={drop}
          radiusM={radiusM}
          onDrop={(p) => setDrop(p)}
          onPick={openDetail}
          recenterSignal={recenter}
        />
      )}

      <TopBar
        count={businesses.length}
        onOpenFilter={() => setFilterOpen(true)}
        onRecenter={locate}
        onSearch={onSearch}
        onToggleKey={mapKey.toggle}
      />

      <MapKey open={mapKey.open} onClose={mapKey.close} />

      <ScanControls onScanned={refresh} />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        knownCategories={knownCategories}
      />
    </div>
  );
}
