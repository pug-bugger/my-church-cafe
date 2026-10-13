"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import { LOCALES, type LocaleId } from "@/i18n/locales";
import { useProductLanguage } from "@/context/ProductLanguageContext";
import { cn } from "@/lib/utils";

export function ProductLanguageSettings() {
  const { t } = useTranslation();
  const {
    primaryLang,
    secondaryLangs,
    setPrimaryLang,
    setSecondaryLangs,
    mounted,
  } = useProductLanguage();

  const toggleSecondary = (id: LocaleId) => {
    if (secondaryLangs.includes(id)) {
      setSecondaryLangs(secondaryLangs.filter((l) => l !== id));
    } else {
      setSecondaryLangs([...secondaryLangs, id]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t("settings.productLanguage.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("settings.productLanguage.hint")}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Primary language */}
        <div>
          <p className="mb-2 text-sm font-medium">
            {t("settings.productLanguage.primaryLabel")}
          </p>
          {mounted ? (
            <div
              role="radiogroup"
              aria-label={t("settings.productLanguage.primaryLabel")}
              className="inline-flex w-full max-w-sm gap-1 rounded-ctl border border-line bg-surface-sunken p-1"
            >
              {LOCALES.map((option) => {
                const active = option.id === primaryLang;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    lang={option.htmlLang}
                    onClick={() => setPrimaryLang(option.id)}
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
        </div>

        {/* Secondary languages */}
        <div>
          <p className="mb-2 text-sm font-medium">
            {t("settings.productLanguage.secondaryLabel")}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("settings.productLanguage.secondaryHint")}
          </p>
          {mounted ? (
            <div className="flex flex-col gap-2">
              {LOCALES.filter((l) => l.id !== primaryLang).map((option) => {
                const checked = secondaryLangs.includes(option.id);
                return (
                  <div key={option.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`secondary-${option.id}`}
                      checked={checked}
                      onCheckedChange={() => toggleSecondary(option.id)}
                    />
                    <label
                      htmlFor={`secondary-${option.id}`}
                      lang={option.htmlLang}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {option.nativeLabel}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        ({option.englishLabel})
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-16 w-full max-w-sm rounded-ctl" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
