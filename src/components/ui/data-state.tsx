import * as React from "react";

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
  /** Shown when `isEmpty` and not loading/errored. */
  emptyMessage?: React.ReactNode;
  children: React.ReactNode;
}

export function DataState({
  loading = false,
  error = null,
  isEmpty = false,
  loadingFallback,
  emptyMessage = "Nothing to show yet.",
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <>
        {loadingFallback ?? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return <>{children}</>;
}
