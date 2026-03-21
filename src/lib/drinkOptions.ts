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
    values: (d.values ?? []).map((v) => v.label),
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
