import type { DrinkOption } from "@/types";

export type DrinkOptionDefinitionApi = {
  id: number;
  name: string;
  option_key: string;
  type: "checkbox" | "select";
  checkbox_extra_price: number;
  sort_order?: number;
  values: { id: number; label: string; extra_price: number }[];
};

export function mapDefinitionToDrinkOption(
  d: DrinkOptionDefinitionApi
): DrinkOption {
  return {
    id: String(d.id),
    name: d.name,
    type: d.type === "checkbox" ? "checkbox" : "custom",
    // The surcharge travels with the label: the terminal has to show it, and
    // the draft total has to include it. (It used to be dropped here, which is
    // why a priced option was decoration.)
    values: (d.values ?? []).map((v) => ({
      label: v.label,
      extraPrice: Number(v.extra_price ?? 0),
    })),
    checkboxExtraPrice: Number(d.checkbox_extra_price ?? 0),
    defaultValue: d.type === "checkbox" ? false : undefined,
  };
}

export function mapProductApiToDrinkOptions(
  raw: unknown
): DrinkOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d: DrinkOptionDefinitionApi) =>
    mapDefinitionToDrinkOption(d)
  );
}

/**
 * One-line summary of the chosen options, e.g. `"Oat Milk · Large · Take away"`.
 * Select-style options contribute their value; checkbox options contribute
 * their name only when switched on. Mirrors the design canvas' `optionText`.
 */
export function describeSelectedOptions(
  options: DrinkOption[],
  selected: Record<string, string>
): string {
  const parts: string[] = [];
  for (const option of options) {
    const value = selected[option.id];
    if (!value) continue;
    if (option.type === "checkbox") {
      if (value === "true") parts.push(option.name);
    } else if (value !== "false") {
      parts.push(value);
    }
  }
  return parts.join(" · ");
}

/**
 * What the chosen options add to one unit of a line.
 *
 * Deliberately the same walk as `describeSelectedOptions` above — the summary a
 * customer reads and the money they are charged have to agree. This is display
 * only: the server prices every order again from its own tables and its figure
 * is the one that counts.
 */
export function optionsSurcharge(
  options: DrinkOption[],
  selected: Record<string, string>
): number {
  let total = 0;
  for (const option of options) {
    const value = selected[option.id];
    if (!value) continue;
    if (option.type === "checkbox") {
      if (value === "true") total += option.checkboxExtraPrice ?? 0;
    } else if (value !== "false") {
      const match = option.values.find((v) => v.label === value);
      total += match?.extraPrice ?? 0;
    }
  }
  return total;
}

/** Price of one unit of a line: the product plus its chosen options. */
export function lineUnitPrice(
  basePrice: number,
  options: DrinkOption[],
  selected: Record<string, string>
): number {
  return basePrice + optionsSurcharge(options, selected);
}

/** Same summary for a saved line item coming back from the API. */
export function describeServerOptions(
  options: { option_definition_name: string | null; option_value_name: string | null }[] | undefined
): string {
  return (options ?? [])
    .map((option) => {
      const value = option.option_value_name;
      if (value == null || value === "" || value === "false") return null;
      // Checkbox options come back as "true"; show the question's name instead.
      return value === "true" ? option.option_definition_name : value;
    })
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}
