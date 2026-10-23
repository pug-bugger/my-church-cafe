import type { DrinkOption, DrinkOptionValue } from "@/types";
import type { LocaleId } from "@/i18n/locales";
import { getLocalizedName } from "@/lib/productName";

export type DrinkOptionValueApi = {
  id: number;
  label: string;
  label_lt?: string | null;
  label_ru?: string | null;
  extra_price: number;
  /** The choice this option opens on; at most one per definition. */
  is_default?: boolean;
  /** Sold out until this moment; the server sends only a future one. */
  unavailable_until?: string | null;
};

export type DrinkOptionDefinitionApi = {
  id: number;
  name: string;
  name_lt?: string | null;
  name_ru?: string | null;
  option_key: string;
  type: "checkbox" | "select";
  checkbox_extra_price: number;
  /** Whether a checkbox option opens ticked. */
  checkbox_default?: boolean;
  /** Checkbox options only: sold out until this moment. */
  unavailable_until?: string | null;
  sort_order?: number;
  values: DrinkOptionValueApi[];
};

export function mapDefinitionToDrinkOption(
  d: DrinkOptionDefinitionApi
): DrinkOption {
  return {
    id: String(d.id),
    name: d.name,
    nameLt: d.name_lt || undefined,
    nameRu: d.name_ru || undefined,
    type: d.type === "checkbox" ? "checkbox" : "custom",
    // The surcharge travels with the label: the terminal has to show it, and
    // the draft total has to include it. (It used to be dropped here, which is
    // why a priced option was decoration.)
    values: (d.values ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      labelLt: v.label_lt || undefined,
      labelRu: v.label_ru || undefined,
      extraPrice: Number(v.extra_price ?? 0),
      unavailableUntil: v.unavailable_until ?? null,
    })),
    checkboxExtraPrice: Number(d.checkbox_extra_price ?? 0),
    unavailableUntil:
      d.type === "checkbox" ? d.unavailable_until ?? null : null,
    // The answer the sheet opens on. A picklist with no default falls back to
    // its first choice, which is what every option did before defaults existed.
    defaultValue:
      d.type === "checkbox"
        ? Boolean(d.checkbox_default)
        : (d.values ?? []).find((v) => v.is_default)?.label,
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

/** An option's name in the device's product language, falling back to English. */
export function optionName(option: DrinkOption, lang: LocaleId): string {
  return getLocalizedName(option, lang);
}

/** Same, for an option definition straight from the API (the Manage screens). */
export function definitionName(
  def: Pick<DrinkOptionDefinitionApi, "name" | "name_lt" | "name_ru">,
  lang: LocaleId,
): string {
  return getLocalizedName(
    { name: def.name, nameLt: def.name_lt ?? undefined, nameRu: def.name_ru ?? undefined },
    lang,
  );
}

/**
 * One choice's label in the device's product language. Display only: the
 * selection itself always holds the English `label`, which is what the order
 * sends and the kitchen ticket prints.
 */
export function choiceLabel(value: DrinkOptionValue, lang: LocaleId): string {
  return getLocalizedName(
    { name: value.label, nameLt: value.labelLt, nameRu: value.labelRu },
    lang,
  );
}

/**
 * One-line summary of the chosen options, e.g. `"Oat Milk · Large · Take away"`.
 * Select-style options contribute their value; checkbox options contribute
 * their name only when switched on. Mirrors the design canvas' `optionText`.
 * With `lang`, names and labels are shown in that product language.
 */
export function describeSelectedOptions(
  options: DrinkOption[],
  selected: Record<string, string>,
  lang: LocaleId = "en"
): string {
  const parts: string[] = [];
  for (const option of options) {
    const value = selected[option.id];
    if (!value) continue;
    if (option.type === "checkbox") {
      if (value === "true") parts.push(optionName(option, lang));
    } else if (value !== "false") {
      const choice = option.values.find((v) => v.label === value);
      parts.push(choice ? choiceLabel(choice, lang) : value);
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
