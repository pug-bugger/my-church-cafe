"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n";

/**
 * A client component like every other page: the language is a per-device
 * choice held in `localStorage`, so the copy here cannot be rendered on the
 * server. The wordmark is not translated — it is the cafe's name.
 */
export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="flex max-w-[700px] flex-col items-center gap-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Renewal Church Cafe
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("home.tagline")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/orders"
            className="press flex min-h-14 items-center rounded-ctl bg-primary px-8 text-[17px] font-bold text-primary-foreground hover:bg-ac-dark"
          >
            {t("home.pickupBoard")}
          </Link>
          <Link
            href="/menu"
            className="press flex min-h-14 items-center rounded-ctl border border-line bg-surface px-8 text-[17px] font-semibold hover:bg-ink/5"
          >
            {t("home.todaysMenu")}
          </Link>
        </div>
      </div>
    </div>
  );
}
