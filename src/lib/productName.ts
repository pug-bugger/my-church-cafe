/**
 * Resolve product display names based on the viewer's product language
 * preferences. The `name` column is the canonical English name; `nameLt` and
 * `nameRu` are optional translations.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * This file is authored here in the web app and mirrored verbatim into
 * `my-church-cafe-mobile/src/lib/`. Do not edit the mobile copy.
 * ────────────────────────────────────────────────────────────────────────────
 */
import type { LocaleId } from "@/i18n/locales";

type Translatable = {
  name: string;
  nameLt?: string;
  nameRu?: string;
};

export function getLocalizedName(
  product: Translatable,
  lang: LocaleId,
): string {
  switch (lang) {
    case "lt":
      return product.nameLt || product.name;
    case "ru":
      return product.nameRu || product.name;
    default:
      return product.name;
  }
}

export function getSecondaryNames(
  product: Translatable,
  primaryLang: LocaleId,
  secondaryLangs: LocaleId[],
): string[] {
  const primary = getLocalizedName(product, primaryLang);
  const seen = new Set([primary]);
  const result: string[] = [];
  for (const lang of secondaryLangs) {
    if (lang === primaryLang) continue;
    const name = getLocalizedName(product, lang);
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}
