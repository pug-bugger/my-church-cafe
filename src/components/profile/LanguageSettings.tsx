"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Scaffold for the language picker — deliberately inert.
 *
 * Nothing here is wired up yet: the app has no i18n layer, every string is a
 * hard-coded English literal and `layout.tsx` pins `<html lang="en">`. The
 * control is rendered disabled so the Preferences tab shows what is coming
 * without pretending the setting works.
 *
 * TODO: implementing this needs (a) an i18n runtime and extracted message
 * catalogues, (b) a provider storing the choice per-device the way
 * PaletteContext does, and (c) `lang` on <html> following the choice. Until
 * then, leave the buttons disabled — a control that silently does nothing is
 * worse than one that says it is not ready.
 */

const LANGUAGES = [
  { id: "en", label: "English", note: "Current" },
  { id: "lt", label: "Lietuvių", note: "Planned" },
  { id: "ru", label: "Русский", note: "Planned" },
] as const;

const ACTIVE_LANGUAGE = "en";

export function LanguageSettings() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Language</CardTitle>
          <span className="inline-flex items-center rounded-full bg-neutral-soft px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Coming soon
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          The interface is English for now. Lithuanian is planned — this setting
          is not active yet.
        </p>
      </CardHeader>

      <CardContent>
        <div
          role="radiogroup"
          aria-label="Interface language"
          aria-disabled
          className="inline-flex w-full max-w-sm gap-1 rounded-ctl border border-line bg-surface-sunken p-1 opacity-60"
        >
          {LANGUAGES.map((language) => {
            const active = language.id === ACTIVE_LANGUAGE;
            return (
              <button
                key={language.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled
                title="Language switching is not available yet"
                className={cn(
                  "flex min-h-10 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-[calc(var(--r-ctl)-4px)] px-3 text-sm font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {language.label}
                <span className="text-xs font-normal opacity-75">
                  · {language.note}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
