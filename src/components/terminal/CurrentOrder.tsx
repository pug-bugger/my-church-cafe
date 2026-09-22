"use client";

import { useAppStore } from "@/store";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { describeSelectedOptions, lineUnitPrice } from "@/lib/drinkOptions";

/**
 * The counter's running order: a sticky panel beside the picker on desktop,
 * stacked underneath it on phones and tablets.
 */
export function CurrentOrder() {
  const { t } = useTranslation();
  const draftItems = useAppStore((state) => state.draftItems);
  // Every category is orderable, meals and "Other" included — the terminal used
  // to see only drinks and desserts because the store held just those two.
  const orderableProducts = useAppStore((state) => state.products);
  const removeDraftItem = useAppStore((state) => state.removeDraftItem);
  const clearDraft = useAppStore((state) => state.clearDraft);
  const [products, setProducts] = useState<
    { id: number; name: string | null }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComment, setOrderComment] = useState("");
  const [customerName, setCustomerName] = useState("");

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const getProductById = (id: string) =>
    orderableProducts.find((d) => d.id === id);

  const total = draftItems.reduce((sum, item) => {
    const product = getProductById(item.drinkId);
    if (!product) return sum;
    // Option surcharges are part of the line, exactly as the server bills it.
    const unit = lineUnitPrice(
      product.price,
      product.availableOptions,
      item.selectedOptions
    );
    return sum + unit * item.quantity;
  }, 0);

  const itemCount = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (draftItems.length === 0) {
      setOrderComment("");
      setCustomerName("");
    }
  }, [draftItems.length]);

  useEffect(() => {
    if (!apiUrl) return;
    let isActive = true;
    const loadProducts = async () => {
      try {
        const data = await apiFetch<{ id: number; name: string | null }[]>(
          "/api/products",
          { auth: false }
        );
        if (isActive) {
          setProducts(
            Array.isArray(data)
              ? data.map((item) => ({ id: item.id, name: item.name }))
              : []
          );
        }
      } catch (_err) {
        if (isActive) {
          setProducts([]);
        }
      }
    };
    loadProducts();
    return () => {
      isActive = false;
    };
  }, [apiUrl]);

  const resolveProductId = (drinkId: string) => {
    const drink = getProductById(drinkId);
    if (!drink) return null;
    const normalized = (value?: string) => (value || "").trim().toLowerCase();
    const byId =
      Number.isFinite(Number(drink.id)) &&
      products.find((item) => item.id === Number(drink.id));
    if (byId) return byId.id;
    const byName = products.find(
      (item) =>
        normalized(item.name ?? "") === normalized(drink.name) ||
        normalized(item.name ?? "") === normalized(drink.secondaryName)
    );
    return byName?.id ?? null;
  };

  const handleConfirmOrder = async () => {
    if (draftItems.length === 0) return;

    const orderItemsPayload = draftItems.map((item) => ({
      quantity: item.quantity,
      productId: resolveProductId(item.drinkId),
      selectedOptions: item.selectedOptions,
      comment: item.comment || null,
    }));
    const missing = orderItemsPayload.find((item) => !item.productId);
    if (missing) {
      toast.error(t("terminal.unmatchedItems"));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        auth: true,
        authError: t("errors.loginRequiredToOrder"),
        body: {
          order: {
            comment: orderComment.trim() || null,
            customer_name: customerName.trim() || null,
            order_items: orderItemsPayload,
          },
        },
      });
      clearDraft();
      toast.success(t("terminal.orderSent"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.placeOrder");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmpty = draftItems.length === 0;

  return (
    <aside className="flex max-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 className="text-lg font-extrabold tracking-[-0.01em]">
            {t("terminal.currentOrder")}
          </h3>
          <span className="num text-[13px] text-muted-foreground">
            {itemCount === 0
              ? t("common.empty")
              : t("common.itemCount", { count: itemCount })}
          </span>
        </div>
      </div>

      <div className="scroll min-h-[120px] flex-1 px-5">
        {isEmpty ? (
          <p className="my-2 text-sm leading-relaxed text-muted-foreground">
            {t("terminal.emptyHint")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {draftItems.map((item) => {
              const drink = getProductById(item.drinkId);
              if (!drink) return null;
              const summary = describeSelectedOptions(
                drink.availableOptions,
                item.selectedOptions
              );
              const detail = [summary, item.comment]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={item.id} className="enter flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold">
                      {drink.name}{" "}
                      <span className="num text-primary">×{item.quantity}</span>
                    </div>
                    {detail ? (
                      <div className="text-[13px] leading-snug text-muted-foreground">
                        {detail}
                      </div>
                    ) : null}
                  </div>
                  <span className="num whitespace-nowrap text-base font-semibold">
                    {formatPrice(
                      lineUnitPrice(
                        drink.price,
                        drink.availableOptions,
                        item.selectedOptions
                      ) * item.quantity
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(item.id)}
                    aria-label={t("terminal.removeNamed", {
                      name: drink.name,
                    })}
                    title={t("terminal.removeFromOrder")}
                    className="press flex h-11 w-11 flex-none items-center justify-center rounded-[14px] text-muted-foreground hover:bg-ink/5"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-surface-sunken px-5 pb-5 pt-4">
        <Input
          placeholder={t("terminal.customerNamePlaceholder")}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          aria-label={t("terminal.customerName")}
        />
        <Input
          placeholder={t("terminal.noteForBarista")}
          value={orderComment}
          onChange={(e) => setOrderComment(e.target.value)}
          aria-label={t("terminal.noteForBarista")}
        />
        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-[13px] text-muted-foreground">
            {t("common.total")}
          </span>
          <span className="num text-3xl font-extrabold tracking-[-0.02em]">
            {formatPrice(total)}
          </span>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={clearDraft}
            disabled={isEmpty}
            aria-label={t("terminal.clearOrder")}
            title={t("terminal.clearOrderTooltip")}
            className="press flex min-h-14 w-14 flex-none items-center justify-center rounded-ctl border border-line bg-surface text-muted-foreground hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isEmpty || isSubmitting}
            className="press min-h-14 flex-1 rounded-ctl bg-primary text-[17px] font-bold text-primary-foreground hover:bg-ac-dark disabled:pointer-events-none disabled:bg-ac-mid"
          >
            {isSubmitting ? t("terminal.sending") : t("terminal.sendToBarista")}
          </button>
        </div>
      </div>
    </aside>
  );
}
