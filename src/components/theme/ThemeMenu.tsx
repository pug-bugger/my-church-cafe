"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePalette } from "@/context/PaletteContext";
import { cn } from "@/lib/utils";
import { MODES, PALETTES, isPaletteId, type ModeId } from "@/lib/themes";

const MODE_ICONS: Record<ModeId, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * The quick theme switcher in the header: mode and palette in one menu, so a
 * barista on a tablet can change either without leaving the board. The full
 * panel (with previews) lives on /profile.
 */
export function ThemeMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration neither setting is known; render the trigger inert so the
  // markup matches the server and the header doesn't jump.
  if (!mounted) {
    return (
      <Button variant="outline" size="icon" aria-label="Theme" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Theme"
          title="Theme and colours"
        >
          {isDark ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {MODES.map((option) => {
            const Icon = MODE_ICONS[option.id];
            return (
              <DropdownMenuRadioItem key={option.id} value={option.id}>
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Palette</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={palette}
          onValueChange={(value) => {
            if (isPaletteId(value)) setPalette(value);
          }}
        >
          {PALETTES.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <span
                data-palette={option.id}
                aria-hidden
                className={cn(
                  "mr-2 h-4 w-4 shrink-0 rounded-full border border-line bg-primary",
                  isDark && "dark",
                )}
              />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <Palette className="mr-2 h-4 w-4" />
            Preview all themes
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
