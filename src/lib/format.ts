/**
 * Money is shown in euro across the app (the cafe's currency, per the design
 * canvas). Always render prices through these helpers so the symbol and the
 * decimal count stay consistent.
 */

/** `2.5` → `"2.50"` — the bare amount, for when the symbol is rendered separately. */
export function formatAmount(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** `2.5` → `"€2.50"`. */
export function formatPrice(value: number | string | null | undefined): string {
  return `€${formatAmount(value)}`;
}

/** `"Rasa Jonaitė"` → `"RJ"`; falls back to the first letter, then `"?"`. */
export function initialsFromName(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** How long ago something happened, in the canvas' wording: `"just now"` / `"7 min"`. */
export function relativeAge(iso: string | null | undefined): string {
  if (!iso) return "";
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  return minutes < 1 ? "just now" : `${minutes} min`;
}
