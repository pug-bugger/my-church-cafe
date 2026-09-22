/**
 * The colour palettes the app can be themed with.
 *
 * A palette is one half of the theming story: it sets the colour family, while
 * next-themes independently sets light/dark mode. Every palette ships both, so
 * any palette × mode combination is valid.
 *
 * The tokens themselves live in `src/app/globals.css` under
 * `[data-palette="<id>"]` / `[data-palette="<id>"].dark`. This module carries
 * only the identity — adding a palette means adding a block there, an entry
 * here, and its name and description under `settings.palette.<id>` in
 * `src/i18n/messages/settings.json`.
 *
 * The pickers read that copy with
 * `t(`settings.palette.${id}.label`)`, so a palette is named in whichever
 * language the device is set to.
 */

export const PALETTE_ATTRIBUTE = "data-palette";
export const PALETTE_STORAGE_KEY = "church-cafe-palette";

export type PaletteId = "sage" | "slate" | "stone" | "graphite" | "mist";

export type Palette = {
  id: PaletteId;
};

export const PALETTES: Palette[] = [
  { id: "sage" },
  { id: "slate" },
  { id: "stone" },
  { id: "graphite" },
  { id: "mist" },
];

export const DEFAULT_PALETTE: PaletteId = "sage";

const PALETTE_IDS = PALETTES.map((p) => p.id) as string[];

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && PALETTE_IDS.includes(value);
}

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/**
 * The three settings the mode switch offers (next-themes `theme` values).
 * Their labels are `settings.mode.<id>` in the catalogue.
 */
export const MODES = [{ id: "light" }, { id: "dark" }, { id: "system" }] as const;

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
