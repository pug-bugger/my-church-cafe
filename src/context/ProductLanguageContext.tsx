"use client";

/**
 * Product-name language preferences — per-device, like every other visual
 * setting. Controls which translation of a product name is shown as the
 * primary label and which (if any) appear below it in a smaller font.
 *
 * Independent of the UI language: someone might read the interface in English
 * but want product names primarily in Lithuanian with Russian underneath.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocaleId,
  LOCALES,
  type LocaleId,
} from "@/i18n/locales";
import { getLocalizedName, getSecondaryNames } from "@/lib/productName";

export const PRIMARY_LANG_KEY = "church-cafe-product-primary-lang";
export const SECONDARY_LANGS_KEY = "church-cafe-product-secondary-langs";

export type ProductLanguageContextValue = {
  primaryLang: LocaleId;
  secondaryLangs: LocaleId[];
  setPrimaryLang: (lang: LocaleId) => void;
  setSecondaryLangs: (langs: LocaleId[]) => void;
  mounted: boolean;
};

const ProductLanguageContext =
  createContext<ProductLanguageContextValue | null>(null);

function readPrimaryLang(): LocaleId {
  try {
    const v = window.localStorage.getItem(PRIMARY_LANG_KEY);
    if (isLocaleId(v)) return v;
  } catch { /* storage disabled */ }
  return DEFAULT_LOCALE;
}

function readSecondaryLangs(): LocaleId[] {
  try {
    const v = window.localStorage.getItem(SECONDARY_LANGS_KEY);
    if (!v) return [];
    const parsed: unknown = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.filter(isLocaleId);
  } catch { /* storage disabled */ }
  return [];
}

export function ProductLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [primaryLang, setPrimaryLangState] = useState<LocaleId>(DEFAULT_LOCALE);
  const [secondaryLangs, setSecondaryLangsState] = useState<LocaleId[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrimaryLangState(readPrimaryLang());
    setSecondaryLangsState(readSecondaryLangs());
    setMounted(true);
  }, []);

  const setPrimaryLang = useCallback((lang: LocaleId) => {
    setPrimaryLangState(lang);
    try {
      window.localStorage.setItem(PRIMARY_LANG_KEY, lang);
    } catch { /* session-only */ }
  }, []);

  const setSecondaryLangs = useCallback((langs: LocaleId[]) => {
    setSecondaryLangsState(langs);
    try {
      window.localStorage.setItem(SECONDARY_LANGS_KEY, JSON.stringify(langs));
    } catch { /* session-only */ }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRIMARY_LANG_KEY) {
        const v = isLocaleId(e.newValue) ? e.newValue : DEFAULT_LOCALE;
        setPrimaryLangState(v);
      }
      if (e.key === SECONDARY_LANGS_KEY) {
        try {
          const parsed: unknown = JSON.parse(e.newValue ?? "[]");
          if (Array.isArray(parsed)) setSecondaryLangsState(parsed.filter(isLocaleId));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ProductLanguageContextValue>(
    () => ({
      primaryLang,
      secondaryLangs,
      setPrimaryLang,
      setSecondaryLangs,
      mounted,
    }),
    [primaryLang, secondaryLangs, setPrimaryLang, setSecondaryLangs, mounted],
  );

  return (
    <ProductLanguageContext.Provider value={value}>
      {children}
    </ProductLanguageContext.Provider>
  );
}

export function useProductLanguage(): ProductLanguageContextValue {
  const ctx = useContext(ProductLanguageContext);
  if (ctx) return ctx;
  return {
    primaryLang: DEFAULT_LOCALE,
    secondaryLangs: [],
    setPrimaryLang: () => {},
    setSecondaryLangs: () => {},
    mounted: false,
  };
}

type Translatable = { name: string; nameLt?: string; nameRu?: string };

export function useProductDisplayName(product: Translatable | null | undefined) {
  const { primaryLang, secondaryLangs } = useProductLanguage();
  if (!product) return { primary: "", secondary: [] };
  return {
    primary: getLocalizedName(product, primaryLang),
    secondary: getSecondaryNames(product, primaryLang, secondaryLangs),
  };
}
