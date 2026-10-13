"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_PALETTE,
  PALETTE_ATTRIBUTE,
  PALETTE_STORAGE_KEY,
  isPaletteId,
  type PaletteId,
} from "@/lib/themes";

type PaletteContextValue = {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  /** False until the client has read localStorage — mirrors next-themes. */
  mounted: boolean;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

function readStoredPalette(): PaletteId {
  try {
    const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    if (isPaletteId(stored)) return stored;
  } catch {
    /* private mode / storage disabled — fall through to the default */
  }
  return DEFAULT_PALETTE;
}

/**
 * Owns the colour palette half of the theme. Mode (light/dark) stays with
 * next-themes; the two are independent so every combination is reachable.
 *
 * The attribute is already on <html> before hydration thanks to
 * `paletteInitScript`, so this only has to keep it in sync afterwards.
 */
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPaletteState(readStoredPalette());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute(PALETTE_ATTRIBUTE, palette);
  }, [palette, mounted]);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteState(id);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      /* the attribute still applies for this session */
    }
  }, []);

  // Keep other tabs in step, the way next-themes does for the mode.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PALETTE_STORAGE_KEY) return;
      setPaletteState(isPaletteId(event.newValue) ? event.newValue : DEFAULT_PALETTE);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <PaletteContext.Provider value={{ palette, setPalette, mounted }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
