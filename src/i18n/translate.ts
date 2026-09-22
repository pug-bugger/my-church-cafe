/**
 * The translation engine: lookup, plural selection and placeholder
 * interpolation. No React, no platform APIs — the web and the mobile app run
 * this same file.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * Authored here in the web app and mirrored verbatim into
 * `my-church-cafe-mobile/src/i18n/`. Do not edit the mobile copy: change this
 * one and run `npm run i18n:sync`. See `src/i18n/README.md`.
 * ────────────────────────────────────────────────────────────────────────────
 */
import {
  DEFAULT_LOCALE,
  pluralCategory,
  type LocaleId,
  type PluralForm,
} from "./locales";

/**
 * A count-dependent message. Each language declares only the forms it has —
 * English `one`/`other`, Lithuanian `one`/`few`/`other`, Russian
 * `one`/`few`/`many` — and `pickForm` never asks for one the language cannot
 * produce.
 */
export type PluralMessage = Partial<Record<PluralForm, string>>;

/** One translatable string: the same message in every language. */
export type MessageLeaf = Partial<Record<LocaleId, string | PluralMessage>>;

/** A namespace file: leaves, optionally nested in groups. */
export type MessageNode = { [key: string]: MessageLeaf | MessageNode };

/** Values substituted into `{placeholders}`; `count` also drives plurals. */
export type MessageValues = Record<string, string | number> & {
  count?: number;
};

/**
 * Every dotted key the catalogue defines, derived from the catalogue itself so
 * a typo in `t("...")` fails the build instead of rendering the key to a
 * customer. A node is a leaf exactly when it carries an `en` value, which is
 * why `en` is mandatory in `messages/*.json`.
 */
export type MessagePath<T> = {
  [K in Extract<keyof T, string>]: T[K] extends { en: unknown }
    ? K
    : `${K}.${MessagePath<T[K]>}`;
}[Extract<keyof T, string>];

function isLeaf(value: unknown): value is MessageLeaf {
  return typeof value === "object" && value !== null && "en" in value;
}

/**
 * `{ profile: { title: <leaf> } }` → `{ "profile.title": <leaf> }`.
 *
 * Flattened once at module load: lookup is then a single map read, which
 * matters on a screen like the pickup board that re-renders on every socket
 * event.
 */
export function flattenMessages(
  node: MessageNode,
  prefix = "",
  out: Record<string, MessageLeaf> = {},
): Record<string, MessageLeaf> {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isLeaf(value)) {
      out[path] = value;
    } else {
      flattenMessages(value as MessageNode, path, out);
    }
  }
  return out;
}

/**
 * Plural forms in the order they stand in for one another. A message that
 * declares only `other` still answers a `one` lookup, and a Russian message
 * (which has no `other` for whole numbers) still answers a fallback that asked
 * for one.
 */
const FORM_FALLBACKS: Record<PluralForm, PluralForm[]> = {
  one: ["one", "other", "few", "many"],
  few: ["few", "other", "many", "one"],
  many: ["many", "other", "few", "one"],
  other: ["other", "many", "few", "one"],
};

function pickForm(
  message: PluralMessage,
  locale: LocaleId,
  count: number | undefined,
): string {
  const wanted = pluralCategory(locale, count ?? 0);
  for (const form of FORM_FALLBACKS[wanted]) {
    const value = message[form];
    if (typeof value === "string") return value;
  }
  return "";
}

/** Substitutes `{name}` for `values.name`. Unknown names are left in place on
 *  purpose — a visible `{name}` in the UI is how a missing value gets noticed. */
function interpolate(template: string, values?: MessageValues): string {
  if (!values || !template.includes("{")) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

/** Keys already warned about, so a re-rendering screen logs once, not once a frame. */
const warned = new Set<string>();

function warnOnce(message: string): void {
  if (process.env.NODE_ENV === "production" || warned.has(message)) return;
  warned.add(message);
  // eslint-disable-next-line no-console
  console.warn(`[i18n] ${message}`);
}

/**
 * Resolve one key.
 *
 * Falls back to {@link DEFAULT_LOCALE} for a language that has not been filled
 * in yet, and to the key itself for one that does not exist — a screen half
 * translated still reads, and a bad key shows up as `profile.titel` rather
 * than as a blank space.
 */
export function translateWith(
  messages: Record<string, MessageLeaf>,
  locale: LocaleId,
  key: string,
  values?: MessageValues,
): string {
  const leaf = messages[key];
  if (!leaf) {
    warnOnce(`missing key "${key}"`);
    return key;
  }

  // Track which language actually supplied the string: a message not yet
  // translated must be pluralised by the rules of the language it fell back to.
  let usedLocale = locale;
  let message = leaf[locale];
  if (message === undefined) {
    warnOnce(`"${key}" has no ${locale} translation — falling back to ${DEFAULT_LOCALE}`);
    usedLocale = DEFAULT_LOCALE;
    message = leaf[DEFAULT_LOCALE];
  }
  if (message === undefined) return key;

  const template =
    typeof message === "string"
      ? message
      : pickForm(message, usedLocale, values?.count);

  return interpolate(template, values);
}
