"use client";

/**
 * The web app's language layer. **Platform-specific — not mirrored to mobile**
 * (the mobile app has its own `index.tsx` over AsyncStorage and the device
 * locale). Everything it builds on — the catalogue, the engine, the locale
 * registry — is shared.
 *
 * The language is per-device, like the palette and the mode: a shared counter
 * tablet keeps its own, and nothing is stored on the account. It follows
 * `PaletteContext` deliberately closely, down to the cross-tab `storage`
 * listener, so the two settings behave the same way.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MESSAGES, type MessageKey } from "./catalog";
import {
  DEFAULT_LOCALE,
  getLocale,
  isLocaleId,
  LOCALES,
  resolveLocale,
  type Locale,
  type LocaleId,
} from "./locales";
import { setActiveLocale, type TranslateFn } from "./runtime";
import { translateWith, type MessageValues } from "./translate";

export const LANGUAGE_STORAGE_KEY = "church-cafe-language";

export type LanguageContextValue = {
  /** Translate in the current language; re-renders on a switch. */
  t: TranslateFn;
  locale: LocaleId;
  /** Metadata for the current language (native name, `Intl` tag). */
  localeMeta: Locale;
  setLocale: (locale: LocaleId) => void;
  /** Every language the app ships, for the picker. */
  locales: Locale[];
  /** False until localStorage has been read — mirrors `usePalette`. */
  mounted: boolean;
  /** True when the language came from the device rather than a saved choice. */
  isFromDevice: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): { locale: LocaleId; stored: boolean } {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocaleId(value)) return { locale: value, stored: true };
  } catch {
    /* private mode / storage disabled — fall through to the device's own */
  }
  // No saved choice: follow the browser, which is what a guest reading the
  // order board on their own phone expects.
  try {
    return {
      locale: resolveLocale([...(navigator.languages ?? []), navigator.language]),
      stored: false,
    };
  } catch {
    return { locale: DEFAULT_LOCALE, stored: false };
  }
}

/**
 * Applies the saved language to `<html lang>` before first paint, next to the
 * palette's own init script. `lang` drives hyphenation, the spellchecker and
 * how a screen reader pronounces the page, so it must not wait for hydration.
 *
 * It intentionally does *not* try to translate anything before hydration:
 * the server renders the default language, and React swaps the strings on
 * mount. Only the attribute is early.
 */
export const languageInitScript = `(function(){try{var k=${JSON.stringify(
  LANGUAGE_STORAGE_KEY,
)};var m=${JSON.stringify(
  Object.fromEntries(LOCALES.map((l) => [l.id, l.htmlLang])),
)};var v=localStorage.getItem(k);if(!m[v]){var n=(navigator.languages||[navigator.language||""]);for(var i=0;i<n.length;i++){var c=String(n[i]||"").toLowerCase().split(/[-_]/)[0];if(m[c]){v=c;break}}}if(m[v])document.documentElement.setAttribute("lang",m[v])}catch(e){}})()`;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);
  const [isFromDevice, setIsFromDevice] = useState(true);

  useEffect(() => {
    const { locale: initial, stored } = readStoredLocale();
    setLocaleState(initial);
    setIsFromDevice(!stored);
    setActiveLocale(initial);
    setMounted(true);
  }, []);

  // Keep `<html lang>` on the language actually being rendered.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = getLocale(locale).htmlLang;
  }, [locale, mounted]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    setIsFromDevice(false);
    // Module-scope first: a toast raised by the click that changed the
    // language should already be in the new one.
    setActiveLocale(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* the choice still applies for this session */
    }
  }, []);

  // A second tab (the order board on the same terminal) stays in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      const next = isLocaleId(event.newValue) ? event.newValue : DEFAULT_LOCALE;
      setLocaleState(next);
      setActiveLocale(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t: TranslateFn = (key: MessageKey, values?: MessageValues) =>
      translateWith(MESSAGES, locale, key, values);
    return {
      t,
      locale,
      localeMeta: getLocale(locale),
      setLocale,
      locales: LOCALES,
      mounted,
      isFromDevice,
    };
  }, [locale, setLocale, mounted, isFromDevice]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/**
 * `const { t } = useTranslation()` — the only way a component should read a
 * string. Falls back to the default language rather than throwing when used
 * outside the provider, so an isolated component (a test, a Storybook story)
 * still renders.
 */
export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    t: (key: MessageKey, values?: MessageValues) =>
      translateWith(MESSAGES, DEFAULT_LOCALE, key, values),
    locale: DEFAULT_LOCALE,
    localeMeta: getLocale(DEFAULT_LOCALE),
    setLocale: () => {},
    locales: LOCALES,
    mounted: false,
    isFromDevice: true,
  };
}

export { MESSAGES, type MessageKey } from "./catalog";
export {
  DEFAULT_LOCALE,
  getLocale,
  isLocaleId,
  LOCALE_IDS,
  LOCALES,
  pluralCategory,
  resolveLocale,
  type Locale,
  type LocaleId,
} from "./locales";
export {
  categoryLabel,
  categoryName,
  groupLabel,
  roleLabel,
  statusLabel,
  subtypeLabel,
} from "./names";
export {
  getActiveLocale,
  intlLocale,
  setActiveLocale,
  t,
  translateIn,
  type TranslateFn,
} from "./runtime";
export { type MessageValues } from "./translate";
