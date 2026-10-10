"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The language picker, in the Appearance column of Preferences.
 *
 * Per-device, exactly like the palette and the mode: a shared counter tablet
 * keeps its own language and nothing is written to the account. Each language
 * is named in itself — someone looking for Russian is looking for "Русский",
 * not for "Russian" — which is also why the list is never translated.
 *
 * Until a choice is made the app follows the browser's own language, and the
 * note under the picker says so; picking one pins it.
 */
export function LanguageSettings() {
  const { t, locale, setLocale, locales, mounted, isFromDevice } =
    useTranslation();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t("settings.language.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("settings.language.hint")}
        </p>
      </CardHeader>

      <CardContent>
        {mounted ? (
          <div
            role="radiogroup"
            aria-label={t("settings.language.groupLabel")}
            className="inline-flex w-full max-w-sm gap-1 rounded-ctl border border-line bg-surface-sunken p-1"
          >
            {locales.map((option) => {
              const active = option.id === locale;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  // The button's own text is in the language it selects, so it
                  // has to declare that language for a screen reader.
                  lang={option.htmlLang}
                  onClick={() => setLocale(option.id)}
                  className={cn(
                    "press flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--r-ctl)-4px)] px-3 text-sm font-semibold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-ink/5 hover:text-foreground",
                  )}
                >
                  {option.nativeLabel}
                  {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>
        ) : (
          <Skeleton className="h-12 w-full max-w-sm rounded-ctl" />
        )}

        {mounted && isFromDevice ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("settings.language.systemNote")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
