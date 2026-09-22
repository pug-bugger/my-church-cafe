"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import type { Drink, DrinkOption } from "@/types";
import { cn, generateId } from "@/lib/utils";
import { useTranslation, type TranslateFn } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { lineUnitPrice } from "@/lib/drinkOptions";

/**
 * Bottom sheet for adding one product to the draft order.
 *
 * The canvas puts this at the bottom of the screen rather than centre-modal so
 * a barista on the counter tablet can confirm it one-handed; every choice is a
 * pill big enough to hit without looking.
 */

type ProductSheetProps = {
  product: Drink | null;
  onClose: () => void;
};

/** Checkbox options ride in `selectedOptions` as the strings "true"/"false". */
const CHECKBOX_ON = "true";
const CHECKBOX_OFF = "false";

function defaultValueFor(option: DrinkOption): string {
  if (option.type === "checkbox") {
    return option.defaultValue === true ? CHECKBOX_ON : CHECKBOX_OFF;
  }
  if (typeof option.defaultValue === "string" && option.defaultValue) {
    return option.defaultValue;
  }
  return option.values[0]?.label ?? "";
}

type Choice = { label: string; value: string; extraPrice: number };

function choicesFor(option: DrinkOption, t: TranslateFn): Choice[] {
  if (option.type === "checkbox") {
    // The only two choices the app words itself; every other label is an
    // option value an admin typed, and stays as typed.
    return [
      { label: t("common.no"), value: CHECKBOX_OFF, extraPrice: 0 },
      {
        label: t("common.yes"),
        value: CHECKBOX_ON,
        extraPrice: option.checkboxExtraPrice ?? 0,
      },
    ];
  }
  return option.values.map((v) => ({
    label: v.label,
    value: v.label,
    extraPrice: v.extraPrice,
  }));
}

export function ProductSheet({ product, onClose }: ProductSheetProps) {
  const { t } = useTranslation();
  const addDraftItem = useAppStore((state) => state.addDraftItem);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});

  const options = useMemo(
    () => product?.availableOptions ?? [],
    [product]
  );

  // Reset to the product's defaults each time a different tile opens the sheet.
  useEffect(() => {
    if (!product) return;
    const initial: Record<string, string> = {};
    for (const option of product.availableOptions) {
      initial[option.id] = defaultValueFor(option);
    }
    setPicks(initial);
    setQuantity(1);
    setNote("");
  }, [product]);

  if (!product) return null;

  // The options chosen are part of the price, so the sheet quotes what the
  // server will charge rather than the bare product price.
  const unitPrice = lineUnitPrice(product.price, options, picks);
  const lineTotal = unitPrice * quantity;

  const handleAdd = () => {
    addDraftItem({
      id: generateId(),
      drinkId: product.id,
      quantity,
      selectedOptions: picks,
      comment: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-[720px] animate-sheet-in overflow-y-auto rounded-t-[26px] bg-surface px-5 pb-6 pt-5 shadow-float motion-reduce:animate-none sm:px-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-2xl font-extrabold tracking-[-0.015em]">
                {product.name}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="num text-[15px] text-muted-foreground">
                {t("terminal.eachPrice", { price: formatPrice(unitPrice) })}
                {unitPrice !== product.price ? (
                  <span className="ml-1.5 text-[13px]">
                    {t("terminal.basePlusOptions", {
                      price: formatPrice(product.price),
                    })}
                  </span>
                ) : null}
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("terminal.closeWithoutAdding")}
              className="press flex h-11 w-11 flex-none items-center justify-center rounded-[14px] text-muted-foreground hover:bg-ink/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {options.map((option) => (
              <div key={option.id}>
                <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">
                  {option.name}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {choicesFor(option, t).map((choice) => {
                    const selected = picks[option.id] === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setPicks((prev) => ({
                            ...prev,
                            [option.id]: choice.value,
                          }))
                        }
                        className={cn(
                          "press min-h-[50px] rounded-full border px-5 text-[15px] font-semibold",
                          selected
                            ? "border-ac bg-primary text-primary-foreground"
                            : "border-line bg-surface text-foreground hover:bg-ink/5"
                        )}
                      >
                        {choice.label}
                        {choice.extraPrice > 0 ? (
                          <span
                            className={cn(
                              "num ml-1.5 text-[13px] font-medium",
                              selected ? "opacity-80" : "text-muted-foreground"
                            )}
                          >
                            +{formatPrice(choice.extraPrice)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">
                  {t("common.quantity")}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={t("terminal.decreaseQuantity")}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="press flex h-14 w-14 items-center justify-center rounded-ctl border border-line bg-surface hover:bg-ink/5"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span
                    className="num min-w-[52px] text-center text-[26px] font-extrabold"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={t("terminal.increaseQuantity")}
                    onClick={() => setQuantity((q) => q + 1)}
                    className="press flex h-14 w-14 items-center justify-center rounded-ctl border border-line bg-surface hover:bg-ink/5"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="min-w-[230px] flex-1">
                <label
                  htmlFor="sheet-note"
                  className="mb-2.5 block text-[13px] font-semibold text-muted-foreground"
                >
                  {t("terminal.noteForItem")}
                </label>
                <Input
                  id="sheet-note"
                  placeholder={t("terminal.notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-[50px]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="press min-h-[60px] rounded-ctl bg-primary text-lg font-bold text-primary-foreground hover:bg-ac-dark"
            >
              {t("terminal.addToOrder", { price: formatPrice(lineTotal) })}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
