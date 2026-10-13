"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useTranslation } from "@/i18n";

/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 200;
const MAX_SUGGESTIONS = 6;

/**
 * Names used on earlier orders that match what has been typed, from
 * `GET /api/customer-names`. Typed names are saved by the server when the
 * order is sent, so there is nothing to write from here.
 *
 * Any failure — signed out, an older backend, the migration not run yet —
 * just means no suggestions; the field itself always works.
 */
function useNameSuggestions(query: string): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !getAuthToken()) {
      setNames([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const found = await apiFetch<string[]>(
          `/api/customer-names?q=${encodeURIComponent(q)}&limit=${MAX_SUGGESTIONS}`
        );
        if (active) setNames(Array.isArray(found) ? found : []);
      } catch (_err) {
        if (active) setNames([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return names;
}

/**
 * The terminal's "Customer name" field, suggesting names from earlier orders
 * as the barista types. Suggestions are a row of chips under the field rather
 * than a floating dropdown: the order panel clips its overflow, and a chip is
 * a bigger target on the counter tablet.
 */
export function CustomerNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  // Only what the barista typed drives the search, so picking a suggestion
  // (or the draft being cleared) puts the chips away instead of searching
  // for the name just chosen.
  const [query, setQuery] = useState("");
  const suggestions = useNameSuggestions(query);

  const typed = value.trim().toLowerCase();
  const visible = typed
    ? suggestions.filter((name) => name.trim().toLowerCase() !== typed)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder={t("terminal.customerNamePlaceholder")}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        aria-label={t("terminal.customerName")}
        autoComplete="off"
      />
      {visible.length > 0 ? (
        <div
          role="group"
          aria-label={t("terminal.nameSuggestions")}
          className="flex flex-wrap gap-1.5"
        >
          {visible.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setQuery("");
              }}
              className="press min-h-9 max-w-full truncate rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-foreground hover:bg-ink/5"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
