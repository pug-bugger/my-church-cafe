"use client";

import { cn } from "@/lib/utils";
import type { PaletteId } from "@/lib/themes";

/**
 * A miniature of the app rendered in one palette.
 *
 * It scopes `data-palette` (and, for the dark preview, the `dark` class) to
 * itself, and globals.css re-declares the tokens on every `[data-palette]`
 * element — so this paints from the real theme with ordinary utility classes,
 * and a preview can never drift from the palette it advertises.
 */
export function PaletteSwatch({
  palette,
  mode,
  className,
}: {
  palette: PaletteId;
  mode: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      data-palette={palette}
      aria-hidden
      className={cn(
        "flex h-14 w-full flex-col justify-between overflow-hidden rounded-lg border border-line bg-background p-1.5",
        mode === "dark" && "dark",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-primary" />
        <span className="h-1 flex-1 rounded-full bg-foreground/70" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3.5 flex-1 rounded-[5px] bg-primary" />
        <span className="h-3.5 w-4 rounded-[5px] bg-secondary" />
        <span className="h-3.5 w-3 rounded-[5px] bg-muted" />
      </div>
    </div>
  );
}
