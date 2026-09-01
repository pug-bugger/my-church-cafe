"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DataState } from "@/components/ui/data-state";
import { defaultDrinks } from "@/data/defaultDrinks";
import {
  groupByDrinkSubtype,
  menuProductSubtypeLabel,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  type ProductCategoryName,
} from "@/lib/productCategories";
import { formatPrice } from "@/lib/format";

type Product = {
  id: string | number;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  category_name?: string | null;
  parent_category_name?: string | null;
  available?: boolean | number | null;
};

type MenuGroup = { name: string; items: Product[] };

function productTypeName(product: Product): string | null {
  return product.parent_category_name ?? product.category_name ?? null;
}

const MENU_SECTIONS: { title: string; category: ProductCategoryName }[] = [
  { title: "Drinks", category: PRODUCT_CATEGORY.DRINK },
  { title: "Meals", category: PRODUCT_CATEGORY.MEAL },
  { title: "Desserts", category: PRODUCT_CATEGORY.DESSERT },
];

function isAvailable(value: Product["available"]): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return value === 1;
  return value;
}

/** "Sunday, 1 September" — the day the board is being read. */
function dateline(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * The board is meant to be read across a room from a portrait screen, so the
 * card's type is sized to whatever makes the whole menu fit — never scroll.
 * Everything inside the card is sized in `em`, so changing this one font-size
 * reflows the columns properly instead of just squashing them.
 */
/** In the page it stays at a comfortable reading size; on a room screen it
 *  grows to whatever the display can hold. */
/**
 * The board's headline cycles slowly so a screen left up all morning still has
 * something to say. Swapping is a fade out, change, fade back in — one element,
 * so the line never jumps while both strings are on screen.
 */
const TAGLINES = [
  "Today at the cafe",
  "Daily Bread and Daily Brew",
  "Fellowship starts here — one cup at a time",
  "Every cup brewed with a blessing",
];
const TAGLINE_INTERVAL_MS = 10_000;
const TAGLINE_FADE_MS = 400;

function useRotatingTagline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (TAGLINES.length < 2) return;

    // With motion reduced the fade is disabled in CSS, so hiding first would
    // just blank the line for 400ms — swap straight over instead.
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let swap: ReturnType<typeof setTimeout>;
    const advance = () => setIndex((i) => (i + 1) % TAGLINES.length);
    const cycle = setInterval(() => {
      if (reducedMotion) {
        advance();
        return;
      }
      setVisible(false);
      swap = setTimeout(() => {
        advance();
        setVisible(true);
      }, TAGLINE_FADE_MS);
    }, TAGLINE_INTERVAL_MS);

    return () => {
      clearInterval(cycle);
      clearTimeout(swap);
    };
  }, []);

  return { tagline: TAGLINES[index], visible };
}

const MAX_BOARD_FONT_PX = 22;
const MAX_BOARD_FONT_PRESENTING_PX = 48;
const MIN_BOARD_FONT_PX = 9;
const BOARD_FONT_STEP_PX = 0.5;

/** Below this the board scrolls normally — shrinking to fit a phone is unreadable. */
const FIT_MIN_VIEWPORT_PX = 640;

/** Breathing room kept under the board (and clear of the full-screen button). */
const BOARD_BOTTOM_GUTTER_PX = 28;

function useFitToBox(maxFontPx: number, deps: unknown[]) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    if (window.innerWidth < FIT_MIN_VIEWPORT_PX) {
      content.style.fontSize = "";
      return;
    }

    // Measure against the viewport, not the box: the box is free to grow with
    // its content, so its own height would always look like it fits.
    const available =
      window.innerHeight -
      box.getBoundingClientRect().top -
      BOARD_BOTTOM_GUTTER_PX;
    if (available <= 0) return;

    // Start at the largest comfortable size and step down until it fits. Each
    // step reflows, so the column balance stays correct at the final size.
    let size = maxFontPx;
    content.style.fontSize = `${size}px`;
    while (size > MIN_BOARD_FONT_PX && content.scrollHeight > available) {
      size -= BOARD_FONT_STEP_PX;
      content.style.fontSize = `${size}px`;
    }
  }, [maxFontPx]);

  useLayoutEffect(() => {
    fit();
    const box = boxRef.current;
    if (!box) return;
    // Observe the box only — observing the content we resize would loop.
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...deps]);

  return { boxRef, contentRef };
}

function MenuListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[3, 1].map((sections, card) => (
        <div
          key={card}
          className="rounded-card border border-line bg-surface p-6 sm:p-8"
        >
          {Array.from({ length: sections }).map((_, i) => (
            <div key={i} className="mb-6 space-y-3.5 last:mb-0">
              <Skeleton className="h-5 w-28" />
              <div className="columns-1 gap-10 sm:columns-2">
                {Array.from({ length: 4 }).map((_, row) => (
                  <Skeleton key={row} className="mb-3 h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** One priced row: name, dot leader, price. */
function MenuRow({ product }: { product: Product }) {
  return (
    <li className="flex break-inside-avoid items-baseline gap-[0.6em]">
      <span className="text-[1em]">{product.name}</span>
      {/* Dot leader tying the name to its price. */}
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="num text-[1em] font-semibold">
        {formatPrice(product.base_price)}
      </span>
    </li>
  );
}

/**
 * A card of categories. Each category's items run in two columns, and the next
 * category always starts on a fresh line below rather than flowing alongside.
 */
function MenuCard({ groups }: { groups: MenuGroup[] }) {
  return (
    <section className="rounded-card border border-line bg-surface p-[1.4em] sm:p-[1.6em]">
      {groups.map((group) => (
        <div key={group.name} className="mb-[1.4em] last:mb-0">
          <h2 className="mb-[0.7em] text-[1.05em] font-bold text-ac-dark">
            {group.name}
          </h2>
          <ul className="columns-1 gap-[2.5em] sm:columns-2">
            {group.items.map((product) => (
              <MenuRow key={String(product.id)} product={product} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function MenuList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const subtypeOrder = useDrinkSubtypeOrder();

  /**
   * Presentation mode fills the screen with just the board. The real Fullscreen
   * API is used where it exists (so browser chrome goes too); the fixed overlay
   * is what actually hides the app header, and stands alone on browsers — iOS
   * Safari — that refuse element fullscreen.
   */
  const togglePresenting = useCallback(() => {
    setPresenting((wasPresenting) => {
      if (wasPresenting) {
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
        return false;
      }
      void rootRef.current?.requestFullscreen?.().catch(() => {});
      return true;
    });
  }, []);

  // Esc leaves native fullscreen without telling React; keep the two in step.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setProducts(
        defaultDrinks.map((drink) => ({
          id: drink.id,
          name: drink.name,
          description: drink.description,
          base_price: drink.price,
          category_name: drink.subtypeName ?? PRODUCT_CATEGORY.DRINK,
          parent_category_name: PRODUCT_CATEGORY.DRINK,
          available: true,
        })),
      );
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Product[]>("/api/products", {
          auth: false,
          signal: controller.signal,
        });
        if (!Array.isArray(data)) {
          throw new Error("Invalid response while loading menu");
        }
        setProducts(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not load menu right now.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, []);

  const availableProducts = useMemo(
    () => products.filter((product) => isAvailable(product.available)),
    [products],
  );

  /** Drink subtypes in menu order — these share one card. */
  const drinkGroups = useMemo<MenuGroup[]>(() => {
    const drinkItems = availableProducts.filter((p) =>
      isProductCategory(productTypeName(p), PRODUCT_CATEGORY.DRINK),
    );
    return groupByDrinkSubtype(
      drinkItems,
      menuProductSubtypeLabel,
      subtypeOrder,
    ).map((section) => ({ name: section.title, items: section.items }));
  }, [availableProducts, subtypeOrder]);

  /**
   * Everything that is not a drink — desserts, meals, anything uncategorised.
   * Each gets its own card, so a dessert is never read as a drink.
   */
  const otherGroups = useMemo<MenuGroup[]>(() => {
    const result: MenuGroup[] = [];

    for (const { title, category } of MENU_SECTIONS) {
      if (category === PRODUCT_CATEGORY.DRINK) continue;
      const items = availableProducts.filter((p) =>
        isProductCategory(productTypeName(p), category),
      );
      if (items.length) result.push({ name: title, items });
    }

    const uncategorized = availableProducts.filter((p) => {
      const type = productTypeName(p);
      if (!type) return true;
      return !MENU_SECTIONS.some(({ category }) =>
        isProductCategory(type, category),
      );
    });
    if (uncategorized.length) {
      result.push({ name: "Other", items: uncategorized });
    }

    return result;
  }, [availableProducts]);

  const { tagline, visible: taglineVisible } = useRotatingTagline();

  // A longer headline can wrap to a second line and push the board down, so the
  // fit has to re-run whenever the line changes.
  const { boxRef, contentRef } = useFitToBox(
    presenting ? MAX_BOARD_FONT_PRESENTING_PX : MAX_BOARD_FONT_PX,
    [drinkGroups, otherGroups, presenting, tagline],
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col",
        presenting &&
          "fixed inset-0 z-50 h-full overflow-auto bg-background p-5 sm:overflow-hidden sm:p-8",
      )}
    >
      <DataState
        loading={loading}
        error={error}
        isEmpty={availableProducts.length === 0}
        loadingFallback={<MenuListSkeleton />}
        emptyMessage="No products are currently available."
      >
        <h1
          className={cn(
            "mb-1 text-[28px] font-extrabold tracking-[-0.02em] transition-[opacity,transform] ease-out motion-reduce:transition-none",
            taglineVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0",
          )}
          style={{ transitionDuration: `${TAGLINE_FADE_MS}ms` }}
        >
          {tagline}
        </h1>
        <p className="mb-[22px] text-sm text-muted-foreground">
          {dateline()} · prices in euro
        </p>

        {/* The box is the space the board may occupy; the cards inside are
            sized down until they fit, so the whole menu is visible at once. */}
        <div ref={boxRef} className="min-h-0 flex-1 sm:overflow-hidden">
          <div
            ref={contentRef}
            className="flex flex-col gap-[1.2em] text-[15px]"
          >
            {drinkGroups.length > 0 ? <MenuCard groups={drinkGroups} /> : null}
            {otherGroups.map((group) => (
              <MenuCard key={group.name} groups={[group]} />
            ))}
          </div>
        </div>
      </DataState>

      <button
        type="button"
        onClick={togglePresenting}
        aria-pressed={presenting}
        title={presenting ? "Exit full screen" : "Show full screen"}
        aria-label={presenting ? "Exit full screen" : "Show full screen"}
        className="press fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-muted-foreground shadow-card hover:bg-ink/5 hover:text-foreground"
      >
        {presenting ? (
          <Minimize2 className="h-5 w-5" />
        ) : (
          <Maximize2 className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
