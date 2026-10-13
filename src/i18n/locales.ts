/**
 * The languages the app ships in.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * This file is part of the i18n core, which is authored here in the web app
 * and mirrored verbatim into `my-church-cafe-mobile/src/i18n/`. Do not edit
 * the mobile copy: change this one and run `npm run i18n:sync`. See
 * `src/i18n/README.md`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Adding a language is three steps:
 *   1. add it to `LOCALES` below,
 *   2. fill its value in on every leaf of `messages/*.json`
 *      (`npm run i18n:check` lists what is still missing),
 *   3. teach `pluralCategory` its plural rule, if it needs one English
 *      doesn't cover.
 *
 * Nothing else branches on the locale id.
 */

export type LocaleId = "en" | "lt" | "ru";

/**
 * Which plural forms a message may declare. A catalogue entry only has to
 * carry the forms its own language actually uses — `pluralCategory` never
 * returns a form the language cannot produce, and lookup falls back to
 * `other` anyway.
 */
export type PluralForm = "one" | "few" | "many" | "other";

export type Locale = {
  id: LocaleId;
  /** How the language is named in its own language — what the picker shows. */
  nativeLabel: string;
  /** English name, for `aria-label`s and developer-facing output. */
  englishLabel: string;
  /** `<html lang>` on the web; the BCP 47 tag for the language. */
  htmlLang: string;
  /**
   * Tag handed to `Intl` for dates and numbers. Regionalised on purpose: the
   * cafe is in Lithuania, so English readers there still want 22/09/2026 and a
   * Monday-first week, which `en-GB` gives and `en-US` does not.
   */
  intlLocale: string;
};

export const LOCALES: Locale[] = [
  {
    id: "en",
    nativeLabel: "English",
    englishLabel: "English",
    htmlLang: "en",
    intlLocale: "en-GB",
  },
  {
    id: "lt",
    nativeLabel: "Lietuvių",
    englishLabel: "Lithuanian",
    htmlLang: "lt",
    intlLocale: "lt-LT",
  },
  {
    id: "ru",
    nativeLabel: "Русский",
    englishLabel: "Russian",
    htmlLang: "ru",
    intlLocale: "ru-RU",
  },
];

/**
 * The language every message is guaranteed to have, and the one lookup falls
 * back to. `messages/*.json` is authored in it, so `en` is never missing.
 */
export const DEFAULT_LOCALE: LocaleId = "en";

export const LOCALE_IDS: LocaleId[] = LOCALES.map((l) => l.id);

export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === "string" && (LOCALE_IDS as string[]).includes(value);
}

export function getLocale(id: LocaleId): Locale {
  return LOCALES.find((l) => l.id === id) ?? LOCALES[0];
}

/**
 * Best supported language for a list of preferences — a browser's
 * `navigator.languages`, or the device's locale list on native. Matches on the
 * language subtag only (`lt-LT` → `lt`), so a regional variant still resolves.
 */
export function resolveLocale(
  preferences: readonly (string | null | undefined)[],
): LocaleId {
  for (const preference of preferences) {
    const tag = (preference ?? "").trim().toLowerCase();
    if (!tag) continue;
    const language = tag.split(/[-_]/)[0];
    const match = LOCALE_IDS.find((id) => id === language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

/**
 * Which plural form `count` takes in `locale` — the CLDR categories, for
 * integers (the app never pluralises a fraction).
 *
 * Lithuanian and Russian both need this; getting it wrong is the kind of bug a
 * native speaker notices immediately and a developer never sees. `Intl.PluralRules`
 * is deliberately not used: it would put the wording of a receipt at the mercy
 * of whether the platform shipped full ICU data, and Hermes has historically
 * shipped without it on Android.
 */
export function pluralCategory(locale: LocaleId, count: number): PluralForm {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;

  switch (locale) {
    case "lt":
      // one: 1, 21, 31 … but not the teens.  few: 2–9, 22–29 … also not teens.
      // other: 0, 10–20, 30, 40 …
      if (mod10 === 1 && (mod100 < 11 || mod100 > 19)) return "one";
      if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) return "few";
      return "other";

    case "ru":
      // one: 1, 21, 101 …   few: 2–4, 22–24 …   many: 0, 5–20, 25–30 …
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
      return "many";

    default:
      return n === 1 ? "one" : "other";
  }
}
