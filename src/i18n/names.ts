/**
 * Translating names that come out of the database.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * Authored here in the web app and mirrored verbatim into
 * `my-church-cafe-mobile/src/i18n/`. Do not edit the mobile copy: change this
 * one and run `npm run i18n:sync`. See `src/i18n/README.md`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Categories, drink subtypes and option labels are rows an admin can create,
 * so they cannot live in the catalogue the way a button label does. What *can*
 * be translated is the set that ships seeded — `Drink`, `Coffee`,
 * `Season drinks` and the rest — and everything else falls through to the name
 * as it was typed. A cafe that adds "Kompotas" sees "Kompotas" in all three
 * languages, which is right: nobody translated it.
 *
 * Product names themselves are never translated. They are the cafe's own
 * wording and the barista reads them off the same ticket in any language.
 */
import type { MessageKey } from "./catalog";
import { t as translate, type TranslateFn } from "./runtime";

function normalize(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/** Seeded top-level categories → their plural heading key. */
const CATEGORY_KEYS: Record<string, MessageKey> = {
  drink: "products.category.drink",
  meal: "products.category.meal",
  dessert: "products.category.dessert",
  other: "products.category.other",
};

/** The same categories, named in the singular (a form's category picker). */
const CATEGORY_SINGULAR_KEYS: Record<string, MessageKey> = {
  drink: "products.categorySingular.drink",
  meal: "products.categorySingular.meal",
  dessert: "products.categorySingular.dessert",
  other: "products.categorySingular.other",
};

/** Seeded drink subtypes → their key. */
const SUBTYPE_KEYS: Record<string, MessageKey> = {
  coffee: "products.subtype.coffee",
  "season drinks": "products.subtype.seasonDrinks",
  "other drinks": "products.subtype.otherDrinks",
};

/**
 * Plural heading for a top-level category ("Drinks"), or the raw name for a
 * category this app does not ship.
 *
 * Pass the `t` from `useTranslation()` in a component, so the label re-renders
 * on a language switch; omit it outside React and the module-scope one is used.
 */
export function categoryLabel(
  name: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const key = CATEGORY_KEYS[normalize(name)];
  return key ? t(key) : (name ?? "").trim();
}

/** Singular name for a top-level category ("Drink"), else the raw name. */
export function categoryName(
  name: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const key = CATEGORY_SINGULAR_KEYS[normalize(name)];
  return key ? t(key) : (name ?? "").trim();
}

/**
 * A drink subtype's label — translated for the seeded three, raw for one an
 * admin added. Also handles the "Uncategorized" bucket, which is the app's own
 * wording rather than a category row.
 */
export function subtypeLabel(
  name: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const normalized = normalize(name);
  if (!normalized) return t("products.uncategorized");
  const key = SUBTYPE_KEYS[normalized];
  if (key) return t(key);
  // The English bucket label, stored as a plain string in a few places.
  if (normalized === "uncategorized") return t("products.uncategorized");
  return (name ?? "").trim();
}

/**
 * Any group name the pickers show — a drink subtype or a non-drink category,
 * which is how `ProductTable` and `ProductPicker` both bucket rows.
 */
export function groupLabel(
  name: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const normalized = normalize(name);
  const categoryKey = CATEGORY_KEYS[normalized];
  if (categoryKey) return t(categoryKey);
  return subtypeLabel(name, t);
}

const STATUS_KEYS: Record<string, MessageKey> = {
  pending: "status.pending",
  preparing: "status.preparing",
  ready: "status.ready",
  paid: "status.paid",
  completed: "status.completed",
  cancelled: "status.cancelled",
};

/** An order status, named for a customer; unknown statuses pass through. */
export function statusLabel(
  status: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const key = STATUS_KEYS[normalize(status)];
  return key ? t(key) : (status ?? "").trim();
}

/** A role, named for a person; unknown roles pass through. */
export function roleLabel(
  role: string | null | undefined,
  t: TranslateFn = translate,
): string {
  const normalized = normalize(role);
  if (normalized === "admin") return t("profile.role.admin");
  if (normalized === "personal") return t("profile.role.personal");
  if (normalized === "parishioner") return t("profile.role.parishioner");
  return (role ?? "").trim();
}
