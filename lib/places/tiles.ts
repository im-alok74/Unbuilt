export interface Tile {
  lat: number;
  lng: number;
  radius: number;
}

const MAX_TILES = 90;
// Google Nearby Search (New) is hard-capped at 20 results per call. To find the
// small independent businesses (not just the 20 most famous chains) we cover the
// scan area with an overlapping grid of small circles and rank each by DISTANCE.
const TILE_R = 650;
const STEP = 880; // centre spacing — tiles overlap so nothing falls between them
const SINGLE_TILE_MAX = 700; // below this, one call is enough

export function planTiles(
  center: { lat: number; lng: number },
  radiusM: number,
): Tile[] {
  if (radiusM <= SINGLE_TILE_MAX) {
    return [{ lat: center.lat, lng: center.lng, radius: radiusM }];
  }

  const latPerM = 1 / 111_320;
  const lngPerM = 1 / (111_320 * Math.cos((center.lat * Math.PI) / 180));

  const tiles: Tile[] = [];
  const rings = Math.ceil(radiusM / STEP) + 1;
  for (let iy = -rings; iy <= rings; iy++) {
    const rowOffset = iy % 2 === 0 ? 0 : STEP / 2;
    for (let ix = -rings; ix <= rings; ix++) {
      const dx = ix * STEP + rowOffset;
      const dy = iy * STEP * 0.866; // hex row height
      if (Math.hypot(dx, dy) > radiusM + TILE_R * 0.5) continue;
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
  const apiCalls = tiles; // one Nearby Search (Enterprise SKU) call per tile
  return { tiles, apiCalls, approxCredits: apiCalls, heavy: apiCalls >= 10 };
}
