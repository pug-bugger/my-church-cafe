/**
 * The colour palettes the app can be themed with.
 *
 * A palette is one half of the theming story: it sets the colour family, while
 * next-themes independently sets light/dark mode. Every palette ships both, so
 * any palette × mode combination is valid.
 *
 * The tokens themselves live in `src/app/globals.css` under
 * `[data-palette="<id>"]` / `[data-palette="<id>"].dark`. This module only
 * carries the identity and copy used by the pickers — adding a palette means
 * adding a block there *and* an entry here.
 */

export const PALETTE_ATTRIBUTE = "data-palette";
export const PALETTE_STORAGE_KEY = "church-cafe-palette";

export type PaletteId = "sage" | "slate" | "stone" | "graphite" | "mist";

export type Palette = {
  id: PaletteId;
  label: string;
  /** One line for the picker — names the neutral and the accent. */
  description: string;
};

export const PALETTES: Palette[] = [
  {
    id: "sage",
    label: "Sage",
    description: "Warm off-white with a sage green accent",
  },
  {
    id: "slate",
    label: "Slate",
    description: "Cool blue-grey with a deep blue accent",
  },
  {
    id: "stone",
    label: "Stone",
    description: "Warm greige with a muted plum accent",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Pure greyscale with a near-black accent",
  },
  {
    id: "mist",
    label: "Mist",
    description: "Cool grey with a soft teal accent",
  },
];

export const DEFAULT_PALETTE: PaletteId = "sage";

const PALETTE_IDS = PALETTES.map((p) => p.id) as string[];

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && PALETTE_IDS.includes(value);
}

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** The three settings the mode switch offers (next-themes `theme` values). */
export const MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

/**
 * Applies the stored palette to <html> before first paint, so the page never
 * flashes the default palette on reload. Injected as an inline script in
 * `layout.tsx`, next to the one next-themes injects for the mode.
 */
export const paletteInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  PALETTE_STORAGE_KEY,
)});if(${JSON.stringify(
  PALETTE_IDS,
)}.indexOf(p)<0)p=${JSON.stringify(
  DEFAULT_PALETTE,
)};document.documentElement.setAttribute(${JSON.stringify(
  PALETTE_ATTRIBUTE,
)},p)}catch(e){}})()`;
