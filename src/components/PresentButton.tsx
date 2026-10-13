"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "@/i18n";

/** The floating corner button that toggles `usePresentationMode`. */
export function PresentButton({
  presenting,
  onToggle,
}: {
  presenting: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = presenting
    ? t("common.exitFullScreen")
    : t("common.showFullScreen");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={presenting}
      title={label}
      aria-label={label}
      className="press fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-muted-foreground shadow-card hover:bg-ink/5 hover:text-foreground"
    >
      {presenting ? (
        <Minimize2 className="h-5 w-5" />
      ) : (
        <Maximize2 className="h-5 w-5" />
      )}
    </button>
  );
}
