"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaletteSwatch } from "@/components/theme/PaletteSwatch";
import { usePalette } from "@/context/PaletteContext";
import { MODES, PALETTES, type ModeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<ModeId, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * The full appearance panel: light/dark/system on one axis, colour palette on
 * the other. Both settings are per-device (localStorage) — nothing is stored
 * on the account, so a shared terminal keeps its own look.
 */
export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, mounted } = usePalette();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Appearance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saved on this device only — each terminal, tablet and phone keeps its
          own theme.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mode
          </h4>
          {mounted ? (
            <div
              role="radiogroup"
              aria-label="Colour mode"
              className="inline-flex w-full max-w-sm gap-1 rounded-ctl border border-line bg-surface-sunken p-1"
            >
              {MODES.map((option) => {
                const Icon = MODE_ICONS[option.id];
                const active = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(option.id)}
                    className={cn(
                      "press flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--r-ctl)-4px)] px-3 text-sm font-semibold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-ink/5 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-12 w-full max-w-sm rounded-ctl" />
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Palette
          </h4>
          <div
            role="radiogroup"
            aria-label="Colour palette"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PALETTES.map((option) => {
              const active = mounted && palette === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPalette(option.id)}
                  className={cn(
                    "press h-full rounded-card border p-3 text-left",
                    active
                      ? "border-ac ring-2 ring-ring ring-offset-2 ring-offset-card"
                      : "border-line hover:border-ac-mid",
                  )}
                >
                  <div className="flex gap-2">
                    <PaletteSwatch palette={option.id} mode="light" />
                    <PaletteSwatch palette={option.id} mode="dark" />
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-sm font-bold">{option.label}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 text-ac" aria-hidden />
                    )}
                    <span className="sr-only">
                      {active ? "(selected)" : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Each palette ships a light and a dark version — the pair above shows
            both. Switching mode keeps the palette you picked.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
