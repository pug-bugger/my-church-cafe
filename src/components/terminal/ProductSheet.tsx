"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import type { Drink, DrinkOption } from "@/types";
import { cn, generateId } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

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
  return option.values[0] ?? "";
}

function choicesFor(option: DrinkOption): { label: string; value: string }[] {
  if (option.type === "checkbox") {
    return [
      { label: "No", value: CHECKBOX_OFF },
      { label: "Yes", value: CHECKBOX_ON },
    ];
  }
  return option.values.map((value) => ({ label: value, value }));
}

export function ProductSheet({ product, onClose }: ProductSheetProps) {
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

  const lineTotal = product.price * quantity;

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
                {formatPrice(product.price)} each
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close without adding"
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
                  {choicesFor(option).map((choice) => {
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
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">
                  Quantity
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
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
                    aria-label="Increase quantity"
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
                  Note for this item
                </label>
                <Input
                  id="sheet-note"
                  placeholder="e.g. extra hot"
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
              Add to order · {formatPrice(lineTotal)}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
