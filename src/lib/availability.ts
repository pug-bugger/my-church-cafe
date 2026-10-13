import type { Drink, DrinkOption, DrinkOptionValue } from "@/types";

/**
 * Whether something is on sale, as the menu board and the terminal show it.
 *
 * - `live` — on sale.
 * - `soldOut` — taken off until tomorrow (by a barista on the terminal or an
 *   admin in Manage). Still listed, greyed out, so a guest can see it exists
 *   and staff can bring it back with one tap.
 * - `hidden` — taken off for good by an admin. Not listed at all.
 */
export type ProductAvailability = "live" | "soldOut" | "hidden";

/**
 * Whether a "sold out until" moment is still ahead of us. The server sends
 * these as ISO datetimes; one that can't be parsed is treated as still ahead,
 * since the next reload replaces it with the real thing anyway.
 */
export function isStillUnavailable(
  until: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!until) return false;
  const at = Date.parse(until);
  return Number.isNaN(at) || at > now;
}

export function productAvailability(
  product: Pick<Drink, "active" | "available_until">,
  now: number = Date.now()
): ProductAvailability {
  if (product.active !== false) return "live";
  // A temporary hide carries its restore time; a permanent one doesn't. Once
  // that time has passed the product is back — the server flips the flag on
  // its next read, this just doesn't wait for it.
  if (product.available_until) {
    return isStillUnavailable(product.available_until, now) ? "soldOut" : "live";
  }
  return "hidden";
}

/** Whether one picklist choice can be picked right now. */
export function isValueAvailable(
  value: DrinkOptionValue,
  now: number = Date.now()
): boolean {
  return !isStillUnavailable(value.unavailableUntil, now);
}

/** Whether a checkbox option can be ticked right now. */
export function isCheckboxAvailable(
  option: DrinkOption,
  now: number = Date.now()
): boolean {
  return !isStillUnavailable(option.unavailableUntil, now);
}

/**
 * The next moment anything in the catalogue comes back on sale, in ms since
 * the epoch, or null when nothing is sold out. The terminal reloads then, so a
 * counter tablet left on overnight opens with yesterday's sold-outs cleared.
 */
export function nextRestoreAt(
  products: Drink[],
  now: number = Date.now()
): number | null {
  let soonest: number | null = null;
  const consider = (until: string | null | undefined) => {
    if (!until) return;
    const at = Date.parse(until);
    if (Number.isNaN(at) || at <= now) return;
    if (soonest === null || at < soonest) soonest = at;
  };
  for (const product of products) {
    if (product.active === false) consider(product.available_until);
    for (const option of product.availableOptions) {
      consider(option.unavailableUntil);
      for (const value of option.values) consider(value.unavailableUntil);
    }
  }
  return soonest;
}
