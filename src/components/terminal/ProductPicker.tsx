"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import type { Drink } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSheet } from "@/components/terminal/ProductSheet";
import {
  drinkSubtypeLabel,
  groupByDrinkSubtype,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_ORDER,
} from "@/lib/productCategories";
import { groupLabel, useTranslation, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { useWebSocket } from "@/context/WebSocketContext";
import { useProductLanguage } from "@/context/ProductLanguageContext";
import { getLocalizedName, getSecondaryNames } from "@/lib/productName";
import type { LocaleId } from "@/i18n/locales";
import { EyeClockIcon } from "@/components/icons/EyeClockIcon";
import { nextRestoreAt, productAvailability } from "@/lib/availability";

/**
 * The counter tablet's product picker: one row of category pills over a single
 * tile grid. The canvas trades the old per-subtype stack for this so a barista
 * never scrolls past a heading to reach a drink. A toggle beside the pills
 * swaps the grid for a single-column list, remembered per device.
 */

/**
 * Sentinel for the "everything" pill. A key rather than a label — the pill row
 * compares it against the selection, so it must not change with the language.
 */
const ALL_CATEGORY = "__all__";

/** `name` is the canonical subtype/category name; `groupLabel` renders it. */
type Category = { name: string; items: Drink[] };

/**
 * How products are laid out: the tile grid, or one product per row in a single
 * column — denser, and easier to scan top to bottom on a narrow screen.
 * Per-device, like the palette: it is about this screen, not this user.
 */
type PickerView = "tiles" | "list";
const VIEW_STORAGE_KEY = "church-cafe-terminal-view";

function usePickerView(): [PickerView, (view: PickerView) => void] {
  const [view, setViewState] = useState<PickerView>("tiles");

  // Read after mount, not in the initializer: the server render has no
  // localStorage, and the two first renders must agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "tiles" || saved === "list") setViewState(saved);
    } catch (_err) {
      /* storage blocked — keep the default */
    }
  }, []);

  const setView = useCallback((next: PickerView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch (_err) {
      /* storage blocked — the choice lasts until reload */
    }
  }, []);

  return [view, setView];
}

type ItemsProps = {
  items: Drink[];
  onOpen: (id: string) => void;
  /** Flip a product between on sale and sold out until tomorrow. */
  onToggleSoldOut: (product: Drink) => void;
  /** Products whose toggle is waiting on the server. */
  pendingIds: ReadonlySet<string>;
  t: TranslateFn;
  primaryLang: LocaleId;
  secondaryLangs: LocaleId[];
};

/**
 * The corner button on every product: an eye with a clock to take it off sale
 * until tomorrow, an open eye to bring a sold-out one back. A sibling of the
 * product button rather than inside it — a button can't hold a button.
 */
function SoldOutToggle({
  product,
  soldOut,
  pending,
  onToggle,
  t,
  className,
}: {
  product: Drink;
  soldOut: boolean;
  pending: boolean;
  onToggle: (product: Drink) => void;
  t: TranslateFn;
  className?: string;
}) {
  const label = soldOut ? t("terminal.bringBack") : t("terminal.markSoldOut");
  return (
    <button
      type="button"
      onClick={() => onToggle(product)}
      disabled={pending}
      aria-label={`${label}: ${product.name}`}
      title={label}
      className={cn(
        "press flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-50",
        soldOut
          ? "bg-primary text-primary-foreground hover:bg-ac-dark"
          : "text-muted-foreground hover:bg-ink/5 hover:text-foreground",
        className
      )}
    >
      {soldOut ? (
        <Eye className="h-[18px] w-[18px]" />
      ) : (
        <EyeClockIcon className="h-5 w-5" />
      )}
    </button>
  );
}

function SoldOutBadge({ t }: { t: TranslateFn }) {
  return (
    <span className="rounded-full bg-warn-soft px-2.5 py-[5px] text-xs font-semibold text-warn">
      {t("terminal.soldOut")}
    </span>
  );
}

function optionsLabel(product: Drink, t: TranslateFn): string {
  const count = product.availableOptions.length;
  if (count === 0) return t("products.noOptions");
  return t("products.optionCount", { count });
}

function PickerSkeleton() {
  return (
    <div className="space-y-[18px]">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[126px] rounded-card" />
        ))}
      </div>
    </div>
  );
}

/**
 * One tappable product: name, price, and how many questions it will ask. A
 * sold-out one stays in its place, greyed and not tappable, so the grid never
 * shifts under a barista's finger and the way back is right where it was.
 */
function ProductTile({
  product,
  onOpen,
  onToggleSoldOut,
  pendingIds,
  t,
  primaryLang,
  secondaryLangs,
}: Omit<ItemsProps, "items"> & { product: Drink }) {
  const displayName = getLocalizedName(product, primaryLang);
  const secondary = getSecondaryNames(product, primaryLang, secondaryLangs);
  const soldOut = productAvailability(product) === "soldOut";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(product.id)}
        disabled={soldOut}
        className={cn(
          "press tile flex h-full min-h-[126px] w-full flex-col justify-between gap-3 rounded-card border p-[18px] text-left",
          soldOut
            ? "border-dashed border-line bg-surface/50 text-muted-foreground"
            : "border-line bg-surface text-foreground"
        )}
      >
        <span className="flex flex-col gap-1 pr-9">
          <span
            className={cn(
              "text-[19px] font-bold leading-[1.2] tracking-[-0.01em]",
              soldOut && "line-through decoration-2"
            )}
          >
            {displayName}
          </span>
          {secondary.length > 0 ? (
            <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {secondary.join(" · ")}
            </span>
          ) : null}
        </span>
        <span className="flex items-center justify-between gap-2.5">
          <span className="num text-[17px] font-semibold">
            {formatPrice(product.price)}
          </span>
          {soldOut ? (
            <SoldOutBadge t={t} />
          ) : (
            <span className="rounded-full bg-ac-soft px-2.5 py-[5px] text-xs font-semibold text-ac-dark">
              {optionsLabel(product, t)}
            </span>
          )}
        </span>
      </button>
      <SoldOutToggle
        product={product}
        soldOut={soldOut}
        pending={pendingIds.has(product.id)}
        onToggle={onToggleSoldOut}
        t={t}
        className="absolute right-2 top-2"
      />
    </div>
  );
}

function TileGrid({ items, ...rest }: ItemsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
      {items.map((product) => (
        <ProductTile key={product.id} product={product} {...rest} />
      ))}
    </div>
  );
}

/** One product as a full-width row: name on the left, price on the right. */
function ProductRow({
  product,
  onOpen,
  onToggleSoldOut,
  pendingIds,
  t,
  primaryLang,
  secondaryLangs,
}: Omit<ItemsProps, "items"> & { product: Drink }) {
  const displayName = getLocalizedName(product, primaryLang);
  const secondary = getSecondaryNames(product, primaryLang, secondaryLangs);
  const soldOut = productAvailability(product) === "soldOut";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(product.id)}
        disabled={soldOut}
        className={cn(
          "press tile flex min-h-[64px] w-full items-center gap-3 rounded-ctl border py-3 pl-4 pr-14 text-left",
          soldOut
            ? "border-dashed border-line bg-surface/50 text-muted-foreground"
            : "border-line bg-surface text-foreground"
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              "truncate text-[17px] font-bold leading-tight tracking-[-0.01em]",
              soldOut && "line-through decoration-2"
            )}
          >
            {displayName}
          </span>
          {secondary.length > 0 ? (
            <span className="truncate text-[13px] text-muted-foreground">
              {secondary.join(" · ")}
            </span>
          ) : null}
        </span>
        {soldOut ? (
          <span className="flex-none">
            <SoldOutBadge t={t} />
          </span>
        ) : (
          <span className="hidden flex-none rounded-full bg-ac-soft px-2.5 py-[5px] text-xs font-semibold text-ac-dark sm:inline">
            {optionsLabel(product, t)}
          </span>
        )}
        <span className="num w-16 flex-none text-right text-[17px] font-semibold">
          {formatPrice(product.price)}
        </span>
      </button>
      <SoldOutToggle
        product={product}
        soldOut={soldOut}
        pending={pendingIds.has(product.id)}
        onToggle={onToggleSoldOut}
        t={t}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

function RowList({ items, ...rest }: ItemsProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((product) => (
        <ProductRow key={product.id} product={product} {...rest} />
      ))}
    </div>
  );
}

/** Tiles or rows, whichever the picker is set to. */
function ProductItems({ view, ...props }: ItemsProps & { view: PickerView }) {
  return view === "list" ? <RowList {...props} /> : <TileGrid {...props} />;
}

function ViewToggle({
  view,
  onChange,
  t,
}: {
  view: PickerView;
  onChange: (view: PickerView) => void;
  t: TranslateFn;
}) {
  const options = [
    { id: "tiles" as const, label: t("terminal.viewTiles"), Icon: LayoutGrid },
    { id: "list" as const, label: t("terminal.viewList"), Icon: List },
  ];
  return (
    <div
      role="group"
      aria-label={t("terminal.productView")}
      className="flex flex-none gap-1 rounded-full border border-line bg-surface p-1"
    >
      {options.map(({ id, label, Icon }) => {
        const on = view === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={cn(
              "press flex h-10 w-11 items-center justify-center rounded-full",
              on
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-ink/5"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The menu board, one tap from the counter — the same shortcut the mobile
 * terminal has, where staff get no Menu tab at all.
 */
function MenuBoardLink({ t }: { t: TranslateFn }) {
  const label = t("terminal.openMenuBoard");
  return (
    <Link
      href="/menu"
      aria-label={label}
      title={label}
      className="press flex h-12 w-12 flex-none items-center justify-center rounded-full border border-line bg-surface text-muted-foreground hover:bg-ink/5 hover:text-foreground"
    >
      <BookOpen className="h-[18px] w-[18px]" />
    </Link>
  );
}

/**
 * Caption above a run of tiles. Only shown under "All", where the pill row no
 * longer tells you which group you are looking at.
 */
function CategoryLabel({ name, count }: { name: string; count: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <h3 className="text-[13px] font-semibold text-muted-foreground">
        {name}
      </h3>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="num text-xs text-muted-foreground/70">{count}</span>
    </div>
  );
}

export function ProductPicker() {
  const { t } = useTranslation();
  const products = useAppStore((state) => state.products);
  const productsLoading = useAppStore((state) => state.productsLoading);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const toggleProductAvailableApi = useAppStore(
    (state) => state.toggleProductAvailableApi
  );
  const subtypeOrder = useDrinkSubtypeOrder();
  const { productsRefreshKey } = useWebSocket();
  const { primaryLang, secondaryLangs } = useProductLanguage();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = usePickerView();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // Reload whenever a `product:*` socket event fires, as the menu board and the
  // mobile terminal already do — a price, a new drink or a reorder done in
  // Manage should reach the counter tablet without someone refreshing it. Only
  // the catalogue is replaced; the draft order lives elsewhere in the store.
  useEffect(() => {
    loadProducts();
  }, [loadProducts, productsRefreshKey]);

  // Reload the moment the first sold-out product or option comes back, so a
  // tablet left on overnight doesn't open on yesterday's sold-outs. (The
  // server clears them on that read; nothing has to be pushed.)
  useEffect(() => {
    const at = nextRestoreAt(products);
    if (at === null) return;
    const delay = Math.min(Math.max(at - Date.now(), 0) + 1000, 2 ** 31 - 1);
    const timer = setTimeout(() => void loadProducts(), delay);
    return () => clearTimeout(timer);
  }, [products, loadProducts]);

  const setSoldOut = useCallback(
    async (product: Drink, soldOut: boolean) => {
      setPendingIds((prev) => new Set(prev).add(product.id));
      try {
        await toggleProductAvailableApi(product.id, !soldOut, soldOut);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errors.generic"));
        return false;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }
    },
    [toggleProductAvailableApi, t]
  );

  /** One tap, no confirm — the toast's Undo is the safety net. */
  const toggleSoldOut = useCallback(
    async (product: Drink) => {
      const soldOut = productAvailability(product) !== "soldOut";
      if (!(await setSoldOut(product, soldOut))) return;
      const name = getLocalizedName(product, primaryLang);
      toast.success(
        soldOut
          ? t("terminal.markedSoldOut", { name })
          : t("terminal.broughtBack", { name }),
        {
          action: {
            label: t("common.undo"),
            onClick: () => void setSoldOut(product, !soldOut),
          },
        }
      );
    },
    [setSoldOut, primaryLang, t]
  );

  /**
   * "All" first, then drink subtypes in menu order, then every other category
   * in the shared order. The All tab is what a barista reaches for when they
   * know the drink but not its group.
   */
  const sections = useMemo<Category[]>(() => {
    // Sold out until tomorrow stays listed (greyed); only a product an admin
    // hid for good drops off the counter.
    const sellable = products.filter(
      (p) => productAvailability(p) !== "hidden"
    );
    const drinks = sellable.filter((p) =>
      isProductCategory(p.categoryName, PRODUCT_CATEGORY.DRINK)
    );
    const groups = groupByDrinkSubtype(
      drinks,
      drinkSubtypeLabel,
      subtypeOrder
    ).map((section) => ({ name: section.title, items: section.items }));

    for (const category of PRODUCT_CATEGORY_ORDER) {
      if (category === PRODUCT_CATEGORY.DRINK) continue; // already split by subtype
      const items = sellable.filter((p) =>
        isProductCategory(p.categoryName, category)
      );
      if (items.length) {
        groups.push({ name: category, items });
      }
    }
    return groups;
  }, [products, subtypeOrder]);

  const categories = useMemo<Category[]>(() => {
    if (sections.length === 0) return [];
    // Built from the grouped sections so All follows the same running order.
    const all = sections.flatMap((section) => section.items);
    return [{ name: ALL_CATEGORY, items: all }, ...sections];
  }, [sections]);

  // Keep a valid selection as categories load or a category empties out.
  const selected =
    categories.find((c) => c.name === activeCategory) ?? categories[0] ?? null;

  const openProduct = useMemo(() => {
    if (!openId) return null;
    return products.find((product) => product.id === openId) ?? null;
  }, [openId, products]);

  const itemProps = {
    onOpen: setOpenId,
    onToggleSoldOut: toggleSoldOut,
    pendingIds,
    t,
    primaryLang,
    secondaryLangs,
  };

  // Only the first load shows the skeleton. Later ones (a socket event, a
  // sold-out tap echoing back) swap the list in place rather than blanking it.
  if (productsLoading && products.length === 0) {
    return <PickerSkeleton />;
  }

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("terminal.nothingOnSale")}
      </p>
    );
  }

  return (
    <>
      {/* Category pills wrap on the left; the layout toggle stays top-right. */}
      <div className="mb-[18px] flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {categories.map((category) => {
            const on = category.name === selected?.name;
            return (
              <button
                key={category.name}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveCategory(category.name)}
                className={cn(
                  "press flex min-h-12 items-center gap-2.5 rounded-full border px-5 text-[15px] font-semibold",
                  on
                    ? "border-ac bg-primary text-primary-foreground"
                    : "border-line bg-surface text-foreground hover:bg-ink/5"
                )}
              >
                {category.name === ALL_CATEGORY
                  ? t("common.all")
                  : groupLabel(category.name, t)}
                <span className="num text-xs opacity-55">
                  {category.items.length}
                </span>
              </button>
            );
          })}
        </div>
        <ViewToggle view={view} onChange={setView} t={t} />
        <MenuBoardLink t={t} />
      </div>

      {selected?.name === ALL_CATEGORY ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.name}>
              <CategoryLabel
                name={groupLabel(section.name, t)}
                count={section.items.length}
              />
              <ProductItems view={view} items={section.items} {...itemProps} />
            </section>
          ))}
        </div>
      ) : (
        <ProductItems view={view} items={selected?.items ?? []} {...itemProps} />
      )}

      <ProductSheet product={openProduct} onClose={() => setOpenId(null)} />
    </>
  );
}
