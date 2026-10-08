// What the workshop (ui/Workshop) can repaint: the locomotive's livery and
// the driver's outfit, picked from short lists of swatches in the scene's
// palette, so that any mix stays in the art direction.

export type Swatch = { name: string; color: string };

// Locomotive: `body` for the boiler, cab, wheels and buffer beams (a darker
// shade of it for the cab floor and spokes), `roof` for the cab roof,
// `trim` for the bands, dome, handrails and fittings.
export type Livery = { body: string; roof: string; trim: string };

export const BODY_SWATCHES: Swatch[] = [
  { name: "Rouge express", color: "#b8433a" },
  { name: "Vert forêt", color: "#3f7a4a" },
  { name: "Bleu nuit", color: "#2f4f7f" },
  { name: "Canard", color: "#2f7f82" },
  { name: "Moutarde", color: "#d29a3a" },
  { name: "Orange", color: "#d9713a" },
  { name: "Prune", color: "#6b3f63" },
  { name: "Charbon", color: "#34353b" },
];

export const ROOF_SWATCHES: Swatch[] = [
  { name: "Marine", color: "#2b3a5c" },
  { name: "Noir", color: "#25262b" },
  { name: "Brique", color: "#a4493a" },
  { name: "Sapin", color: "#2e4a36" },
  { name: "Bois", color: "#7b5b3e" },
  { name: "Crème", color: "#efdfbf" },
];

export const TRIM_SWATCHES: Swatch[] = [
  { name: "Laiton", color: "#e2b54c" },
  { name: "Cuivre", color: "#c7794a" },
  { name: "Chrome", color: "#c9ced6" },
  { name: "Crème", color: "#f1e8d4" },
  { name: "Noir", color: "#2c2e35" },
];

// Ready-made liveries, the first one the original.
export const LIVERIES: (Livery & { name: string })[] = [
  { name: "Express", body: "#b8433a", roof: "#2b3a5c", trim: "#e2b54c" },
  { name: "Forestière", body: "#3f7a4a", roof: "#25262b", trim: "#e2b54c" },
  { name: "Minuit", body: "#2f4f7f", roof: "#25262b", trim: "#c9ced6" },
  { name: "Charbon", body: "#34353b", roof: "#a4493a", trim: "#c7794a" },
  { name: "Tournesol", body: "#d29a3a", roof: "#2e4a36", trim: "#f1e8d4" },
  { name: "Lagune", body: "#2f7f82", roof: "#efdfbf", trim: "#c7794a" },
];

// Driver: the conductor's uniform and cap, an engine driver's overalls and
// round cap, or the developer's hoodie. `top` for the jacket, shirt or
// hoodie; `bottom` for the trousers (the overalls' bib and the caps too).
export const OUTFIT_STYLES = ["uniform", "overalls", "hoodie"] as const;
export type OutfitStyle = (typeof OUTFIT_STYLES)[number];
export type Outfit = { style: OutfitStyle; top: string; bottom: string };

export const OUTFIT_LABELS: Record<OutfitStyle, string> = {
  uniform: "Uniforme",
  overalls: "Salopette",
  hoodie: "Sweat",
};

// Each style's own colours, put back when switching to it.
export const OUTFITS: Record<OutfitStyle, Outfit> = {
  uniform: { style: "uniform", top: "#3d5a8a", bottom: "#2b3a5c" },
  overalls: { style: "overalls", top: "#e6d3ae", bottom: "#4a6689" },
  hoodie: { style: "hoodie", top: "#2f6f73", bottom: "#4a6689" },
};

export const TOP_SWATCHES: Swatch[] = [
  { name: "Bleu", color: "#3d5a8a" },
  { name: "Canard", color: "#2f6f73" },
  { name: "Rouge", color: "#b8433a" },
  { name: "Moutarde", color: "#d29a3a" },
  { name: "Vert", color: "#5d8f4a" },
  { name: "Écru", color: "#e6d3ae" },
  { name: "Gris", color: "#7d8088" },
  { name: "Prune", color: "#6b3f63" },
];

export const BOTTOM_SWATCHES: Swatch[] = [
  { name: "Marine", color: "#2b3a5c" },
  { name: "Jean", color: "#4a6689" },
  { name: "Noir", color: "#2e2f35" },
  { name: "Brun", color: "#6b4a33" },
  { name: "Kaki", color: "#6d7050" },
  { name: "Brique", color: "#8a2f28" },
];

// A darker (factor < 1) shade of a "#rrggbb" colour, channel by channel.
export function shade(color: string, factor: number) {
  const channels = [1, 3, 5].map((i) =>
    Math.round(parseInt(color.slice(i, i + 2), 16) * factor),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export const DEFAULT_LIVERY: Livery = {
  body: "#b8433a",
  roof: "#2b3a5c",
  trim: "#e2b54c",
};
export const DEFAULT_OUTFIT: Outfit = OUTFITS.uniform;
