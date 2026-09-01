import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card/tile grid that adapts across phone → tablet → desktop.
 *
 * Defaults to 1 column on phones, 2 on tablets (`sm`), 3 on desktop (`lg`) —
 * the layout repeated across the menu, terminal, and admin lists. Pass
 * `className` with different `grid-cols-*` utilities to override.
 */
export type ResponsiveGridProps = React.HTMLAttributes<HTMLDivElement>;

export function ResponsiveGrid({ className, ...props }: ResponsiveGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      {...props}
    />
  );
}
