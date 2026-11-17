/**
 * Reopening a placed order in the terminal.
 *
 * The server stores what was picked as `order_item_options` rows (option name +
 * English label, a checkbox only when ticked); the terminal works in
 * `selectedOptions` (definition id → label, or "true"/"false"). This turns the
 * one back into the other so the order can be changed with the same picker and
 * sheet it was taken with, then sent back through `PUT /api/orders/:id`.
 *
 * Mirrored in `my-church-cafe-mobile/src/lib/editOrder.ts` — keep the two in step.
 */
import type { Drink, OrderItem, ServerOrder, ServerOrderItem } from "@/types";

/** Stored values that mean a ticked checkbox (the server writes "Yes"). */
const TICKED = new Set(["yes", "true", "1"]);

function selectionsFor(product: Drink, item: ServerOrderItem): Record<string, string> {
  const stored = item.product_item_options ?? [];
  const picks: Record<string, string> = {};
  for (const option of product.availableOptions ?? []) {
    // By id when the server sent it; by name for rows written before it did.
    const row =
      stored.find((o) => o.option_definition_id != null && String(o.option_definition_id) === option.id) ??
      stored.find((o) => o.option_definition_name === option.name);
    const value = String(row?.option_value_name ?? "").trim();
    if (option.type === "checkbox") {
      // An unticked box is never stored, so "no row" reads as No.
      picks[option.id] = TICKED.has(value.toLowerCase()) ? "true" : "false";
    } else if (value) {
      picks[option.id] = value;
    }
    // A select with no stored answer was never asked (all of it sold out at
    // the time); leaving it out lets the sheet open on its default.
  }
  return picks;
}

/**
 * The order's lines as terminal draft lines — every line, desserts included
 * (the bar card hides those, but they are part of what is billed). Null when a
 * line's product is no longer in the catalogue: saving would drop it silently.
 */
export function draftFromOrder(order: ServerOrder, products: Drink[]): OrderItem[] | null {
  const lines: OrderItem[] = [];
  for (const [index, item] of order.items.entries()) {
    const productId = item.product_id ?? item.product_item_id;
    const product = products.find((p) => p.id === String(productId));
    if (!product) return null;
    lines.push({
      id: `edit-${order.id}-${item.id}-${index}`,
      drinkId: product.id,
      quantity: Math.max(1, Number(item.quantity) || 1),
      selectedOptions: selectionsFor(product, item),
      comment: item.comment?.trim() || undefined,
    });
  }
  return lines;
}
