"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { ServerOrder } from "@/types";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/i18n";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { PresentButton } from "@/components/PresentButton";

// Guests have no realtime socket connection (that requires a JWT), so the
// board polls instead while unauthenticated. Signed-in screens still poll,
// more slowly, as a safety net: a wall-mounted TV whose socket has silently
// dropped would otherwise never update again.
const GUEST_POLL_INTERVAL_MS = 5000;
const SIGNED_IN_POLL_INTERVAL_MS = 30000;

/** Matches Tailwind's `md:` — where the two boards sit side by side. */
const SIDE_BY_SIDE_QUERY = "(min-width: 768px)";
const MIN_BOARD_HEIGHT_PX = 320;

/**
 * Labels start at the list's CSS size (which scales with the screen, so a TV
 * gets very large type) and step down only when they would not otherwise fit.
 */
const MIN_LABEL_FONT_PX = 20;
const LABEL_FONT_STEP_PX = 2;
/** Space between labels, relative to their size so it scales with them. */
const LABEL_GAP_EM = 0.2;

function orderLabel(order: ServerOrder): string {
  return order.customer_name?.trim() || String(order.order_number ?? order.id);
}

/** Oldest first — the order that has waited longest belongs at the top. */
function byAge(a: ServerOrder, b: ServerOrder): number {
  const diff =
    (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0);
  return diff || a.id - b.id;
}

/**
 * Order labels are the whole point of this screen — a guest reads them from
 * across the room. Names and numbers share one size, set on the list.
 */
function BoardLabel({ label, onDark }: { label: string; onDark?: boolean }) {
  return (
    <span
      data-board-label
      className={cn(
        "enter font-extrabold leading-none tracking-[-0.03em]",
        onDark ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {label}
    </span>
  );
}

/** How many labels, from `start`, stack into one column of `budget` px. */
function fillColumn(
  heights: number[],
  start: number,
  budget: number,
  gap: number,
): number {
  let used = 0;
  let count = 0;
  for (let i = start; i < heights.length; i += 1) {
    const next = count === 0 ? heights[i] : used + gap + heights[i];
    if (next > budget) break;
    used = next;
    count += 1;
  }
  return count;
}

/**
 * Lays the labels out top to bottom in a first column, and only once that
 * column has no room left starts a second one — never a third. With a
 * `bounded` height (the side-by-side board) "room" is the list's own height;
 * on a phone the boards stack and grow, so the labels simply split in half.
 *
 * The type shrinks only when it must: when a label is wider than its column,
 * or when two full columns still can't hold every order. If even the smallest
 * size can't, both columns run equally long and the list scrolls.
 */
function LabelColumns({
  orders,
  bounded,
  onDark,
}: {
  orders: ServerOrder[];
  bounded: boolean;
  onDark?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const half = Math.ceil(orders.length / 2);
  const [split, setSplit] = useState(half);
  const labelsKey = orders.map((o) => `${o.id}:${orderLabel(o)}`).join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      // Both columns are the same width, so a label is the same size in either
      // and DOM order is the orders' order — the split never changes a size.
      const labels = Array.from(
        list.querySelectorAll<HTMLElement>("[data-board-label]"),
      );
      const firstColumn = list.firstElementChild as HTMLElement | null;
      const columnWidth = firstColumn?.clientWidth ?? list.clientWidth;
      const budget = bounded ? list.clientHeight : Infinity;
      const count = labels.length;
      const halfway = Math.ceil(count / 2);

      const place = (size: number) => {
        if (labels.some((label) => label.offsetWidth > columnWidth + 0.5)) {
          return { fits: false, split: halfway };
        }
        if (!bounded) return { fits: true, split: halfway };
        const heights = labels.map((label) => label.offsetHeight);
        const gap = size * LABEL_GAP_EM;
        const first = fillColumn(heights, 0, budget, gap);
        const second = fillColumn(heights, first, budget, gap);
        return first + second >= count
          ? { fits: true, split: first }
          : { fits: false, split: Math.max(first, halfway) };
      };

      list.style.fontSize = "";
      let size = parseFloat(getComputedStyle(list).fontSize);
      let layout = place(size);
      while (!layout.fits && size > MIN_LABEL_FONT_PX) {
        size = Math.max(MIN_LABEL_FONT_PX, size - LABEL_FONT_STEP_PX);
        list.style.fontSize = `${size}px`;
        layout = place(size);
      }
      setSplit(layout.split);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(list);
    // Widths change once the web font arrives, without resizing the list.
    void document.fonts?.ready.then(fit);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [labelsKey, bounded]);

  const columns = [orders.slice(0, split), orders.slice(split)];

  return (
    <div
      ref={listRef}
      className={cn(
        "grid grid-cols-2 items-start gap-x-[0.3em]",
        "text-[clamp(2.5rem,min(7vw,12vh),14rem)]",
        bounded && "min-h-0 flex-1 overflow-y-auto",
      )}
    >
      {columns.map((column, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col items-start"
          style={{ rowGap: `${LABEL_GAP_EM}em` }}
        >
          {column.map((order) => (
            <BoardLabel
              key={order.id}
              label={orderLabel(order)}
              onDark={onDark}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const headingClass =
  "mb-[0.6em] flex-none text-[clamp(1.5rem,min(2.6vw,4.5vh),3.25rem)] font-extrabold";
const emptyClass = "text-[clamp(15px,min(1.4vw,2.5vh),1.75rem)]";

export function OrderList() {
  const { t } = useTranslation();
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const { ordersRefreshKey } = useWebSocket();
  const [isGuest, setIsGuest] = useState(false);
  const { rootRef, presenting, togglePresenting } = usePresentationMode();

  const fetchOrders = useCallback(async () => {
    const token = getAuthToken();
    setIsGuest(!token);
    try {
      const path = token
        ? "/api/orders"
        : `/api/orders/public?organization=${encodeURIComponent(
            process.env.NEXT_PUBLIC_ORG_NAME || "Default",
          )}`;
      const data = await apiFetch<ServerOrder[]>(path);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.loadOrders");
      toast.error(message);
    }
  }, [setOrders, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, ordersRefreshKey]);

  useEffect(() => {
    const interval = setInterval(
      fetchOrders,
      isGuest ? GUEST_POLL_INTERVAL_MS : SIGNED_IN_POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [isGuest, fetchOrders]);

  // Catch up straight away when the screen wakes or the tab comes back,
  // rather than waiting out the rest of the interval.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchOrders]);

  // Side by side, the board fills the screen from its own top edge down, so
  // a wall-mounted TV shows it whole and each list knows how much room a
  // column has. Presenting, the overlay gives it that height directly.
  // Stacked on a phone it just grows with its content.
  const boardRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(false);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const media = window.matchMedia(SIDE_BY_SIDE_QUERY);

    const measure = () => {
      setIsWide(media.matches);
      const board = boardRef.current;
      if (!board || presenting || !media.matches) {
        setBoardHeight(null);
        return;
      }
      const top = board.getBoundingClientRect().top + window.scrollY;
      // The page container's bottom padding stays visible under the board.
      const container = rootRef.current?.parentElement;
      const padBottom = container
        ? parseFloat(getComputedStyle(container).paddingBottom) || 0
        : 0;
      setBoardHeight(
        Math.max(MIN_BOARD_HEIGHT_PX, window.innerHeight - top - padBottom),
      );
    };

    measure();
    window.addEventListener("resize", measure);
    media.addEventListener("change", measure);
    // The header above can change height (fonts loading, a wrapped nav).
    const observer = new ResizeObserver(measure);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    return () => {
      window.removeEventListener("resize", measure);
      media.removeEventListener("change", measure);
      observer.disconnect();
    };
  }, [presenting, rootRef]);

  const bounded = isWide && (presenting || boardHeight !== null);
  const sorted = [...orders].sort(byAge);
  const readyForPickup = sorted.filter((o) => o.status === "ready");
  const preparingOrders = sorted.filter(
    (o) =>
      o.status !== "ready" &&
      o.status !== "completed" &&
      o.status !== "cancelled",
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col",
        presenting &&
          "fixed inset-0 z-50 overflow-auto bg-background p-5 sm:p-8 md:overflow-hidden",
      )}
    >
      <div
        ref={boardRef}
        className={cn(
          "grid grid-cols-1 gap-5 md:grid-cols-2",
          presenting && isWide && "min-h-0 flex-1",
        )}
        style={
          !presenting && boardHeight !== null
            ? { height: boardHeight }
            : undefined
        }
      >
        <section className="flex min-h-0 flex-col rounded-[26px] border border-line bg-surface p-6 sm:p-7 xl:p-9">
          <h2 className={cn(headingClass, "text-muted-foreground")}>
            {t("orders.board.preparing")}
          </h2>
          {preparingOrders.length === 0 ? (
            <p className={cn(emptyClass, "text-muted-foreground")}>
              {t("orders.board.nothingPreparing")}
            </p>
          ) : (
            <LabelColumns orders={preparingOrders} bounded={bounded} />
          )}
        </section>

        <section className="flex min-h-0 flex-col rounded-[26px] bg-primary p-6 sm:p-7 xl:p-9">
          <h2 className={cn(headingClass, "text-primary-foreground/75")}>
            {t("orders.board.readyToPickUp")}
          </h2>
          {readyForPickup.length === 0 ? (
            <p className={cn(emptyClass, "text-primary-foreground/70")}>
              {t("orders.board.nothingReady")}
            </p>
          ) : (
            <LabelColumns orders={readyForPickup} bounded={bounded} onDark />
          )}
        </section>
      </div>

      <PresentButton presenting={presenting} onToggle={togglePresenting} />
    </div>
  );
}
