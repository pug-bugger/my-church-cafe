/**
 * The active language, and the `t()` that reads it.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * Authored here in the web app and mirrored verbatim into
 * `my-church-cafe-mobile/src/i18n/`. Do not edit the mobile copy: change this
 * one and run `npm run i18n:sync`. See `src/i18n/README.md`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The locale lives at module scope as well as in React state, because plenty
 * of translatable strings are produced outside a component: the API client's
 * error messages, the Zustand store, `formatPrice`/`relativeAge`, a Zod schema.
 * Those call `t()` directly.
 *
 * The trade-off is that a module-scope `t()` is not reactive — a string it
 * produced before a language switch is not re-rendered by the switch. That is
 * correct for what uses it (a toast is written once, when it fires) and wrong
 * for anything drawn on screen, which is why components use `useTranslation()`
 * instead. Nothing enforces that; it is the one rule of this module.
 */
import { MESSAGES, type MessageKey } from "./catalog";
import {
  DEFAULT_LOCALE,
  getLocale,
  type LocaleId,
} from "./locales";
import { translateWith, type MessageValues } from "./translate";

let activeLocale: LocaleId = DEFAULT_LOCALE;

/** Called by the provider whenever the choice changes. */
export function setActiveLocale(locale: LocaleId): void {
  activeLocale = locale;
}

export function getActiveLocale(): LocaleId {
  return activeLocale;
}

/** The tag to hand `Intl` for dates and numbers in the active language. */
export function intlLocale(): string {
  return getLocale(activeLocale).intlLocale;
}

/**
 * Translate `key` in the active language.
 *
 * For use outside React. Inside a component use `useTranslation()`, whose `t`
 * re-renders the component when the language changes.
 */
export function t(key: MessageKey, values?: MessageValues): string {
  return translateWith(MESSAGES, activeLocale, key, values);
}

/** Translate in a language other than the active one. */
export function translateIn(
  locale: LocaleId,
  key: MessageKey,
  values?: MessageValues,
): string {
  return translateWith(MESSAGES, locale, key, values);
}

export type TranslateFn = (key: MessageKey, values?: MessageValues) => string;
