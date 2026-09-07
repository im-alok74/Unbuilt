export interface Tile {
  lat: number;
  lng: number;
  radius: number;
}

const MAX_TILES = 60;

/**
 * Google Nearby Search (New) returns at most 20 results per call. For any radius
 * bigger than a single tile we cover the target circle with a hex-ish grid of
 * smaller circles so dense areas still get reasonable coverage.
 */
export function planTiles(
  center: { lat: number; lng: number },
  radiusM: number,
): Tile[] {
  const TILE_R = 1000; // metres
  // A single Nearby Search covers small areas fine (and costs 1 call).
  if (radiusM <= 1500) {
    return [{ lat: center.lat, lng: center.lng, radius: radiusM }];
  }

  const step = TILE_R * 1.5; // horizontal spacing between tile centres
  const latPerM = 1 / 111_320;
  const lngPerM = 1 / (111_320 * Math.cos((center.lat * Math.PI) / 180));

  const tiles: Tile[] = [];
  const rings = Math.ceil(radiusM / step);
  for (let iy = -rings; iy <= rings; iy++) {
    const rowOffset = iy % 2 === 0 ? 0 : step / 2;
    for (let ix = -rings; ix <= rings; ix++) {
      const dx = ix * step + rowOffset;
      const dy = iy * step * 0.866; // hex row height
      const dist = Math.hypot(dx, dy);
      if (dist > radiusM + TILE_R) continue;
      tiles.push({
        lat: center.lat + dy * latPerM,
        lng: center.lng + dx * lngPerM,
        radius: TILE_R,
      });
    }
  }

  if (tiles.length === 0) {
    return [{ lat: center.lat, lng: center.lng, radius: radiusM }];
  }
  return tiles.slice(0, MAX_TILES);
}

export function estimateScan(radiusM: number): {
  tiles: number;
  apiCalls: number;
  approxCredits: number;
  heavy: boolean;
} {
  const tiles = planTiles({ lat: 0, lng: 0 }, radiusM).length;
  // One Nearby Search (Enterprise SKU) call per tile.
  const apiCalls = tiles;
  // Rough guide only — verify current SKU pricing in the Google Cloud console.
  const approxCredits = apiCalls;
  return { tiles, apiCalls, approxCredits, heavy: apiCalls >= 12 };
}
