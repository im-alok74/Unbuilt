/**
 * "Download by niche" presets for the no-website-leads export. Each niche
 * matches against Google Places' `category`/`types` taxonomy, with a text
 * fallback for niches Google doesn't type well (NGOs, generic "studios").
 */
export interface NicheDef {
  id: string;
  label: string;
  /** Google Places "type" slugs — matched against `category` and the `types` array. */
  types: string[];
  /** Fallback case-insensitive regex fragments matched against name/category label. */
  keywords?: string[];
  /** Require rating >= 4.0 and 10+ reviews — the "good" bar for well-established places. */
  qualityFilter?: boolean;
}

export const NICHES: NicheDef[] = [
  {
    id: "ngo",
    label: "NGO / Nonprofit",
    types: ["local_government_office", "community_center"],
    keywords: ["ngo", "foundation", "trust", "welfare", "charitable", "society"],
  },
  {
    id: "studio",
    label: "Studio (art / dance / yoga / photo)",
    types: ["art_studio", "dance_school", "yoga_studio", "recording_studio"],
    keywords: ["studio"],
  },
  { id: "gym", label: "Gym / Fitness", types: ["gym", "fitness_center"] },
  { id: "school", label: "School", types: ["school", "primary_school", "secondary_school"] },
  { id: "cafe", label: "Good Cafe", types: ["cafe", "coffee_shop"], qualityFilter: true },
  { id: "restaurant", label: "Good Restaurant", types: ["restaurant"], qualityFilter: true },
  { id: "hotel", label: "Good Hotel", types: ["lodging", "hotel"], qualityFilter: true },
];

export function getNiche(id: string): NicheDef | undefined {
  return NICHES.find((n) => n.id === id);
}
