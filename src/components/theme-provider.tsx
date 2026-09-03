"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PaletteProvider } from "@/context/PaletteContext";

/**
 * Both theming axes: next-themes owns light/dark on the `dark` class, and
 * PaletteProvider owns the colour family on `data-palette`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <PaletteProvider>{children}</PaletteProvider>
    </NextThemesProvider>
  );
}
