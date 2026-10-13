"use client";

import * as React from "react";
import { useTranslation } from "@/i18n";

/**
 * Renders the right thing for an async list/section: a loading fallback while
 * fetching, an accessible error message, an empty-state message, or the
 * content. Collapses the repeated
 * `loading ? … : error ? … : empty ? … : children` ladder.
 */
export interface DataStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  /** Shown while `loading` (e.g. a <Skeleton/> grid). Defaults to text. */
  loadingFallback?: React.ReactNode;
  /** Shown when `isEmpty` and not loading/errored. Defaults to a generic line
   *  from the catalogue, so a caller with nothing specific to say is still
   *  translated. */
  emptyMessage?: React.ReactNode;
  children: React.ReactNode;
}

export function DataState({
  loading = false,
  error = null,
  isEmpty = false,
  loadingFallback,
  emptyMessage,
  children,
}: DataStateProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <>
        {loadingFallback ?? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
      </>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage ?? t("common.nothingToShow")}
      </p>
    );
  }
  return <>{children}</>;
}
