"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductForm } from "./ProductForm";
import { AddProductDialog } from "./AddProductDialog";
import type { Drink } from "@/types";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  groupLabel,
  useTranslation,
  type MessageKey,
  type TranslateFn,
} from "@/i18n";
import { formatPrice } from "@/lib/format";
import { drinkSubtypeLabel } from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_ORDER,
} from "@/lib/productCategories";

/**
 * Everything on sale in one searchable table, with the editor as a panel
 * beside it — the canvas' Manage → Products tab. Bulk visibility lives in a
 * bar that only appears once rows are ticked.
 */

type StatusFilter = "all" | "live" | "hidden";
/** Filter identities, not labels — `manage.product.filter*` supplies those. */
const STATUS_FILTERS: StatusFilter[] = ["all", "live", "hidden"];
const STATUS_FILTER_LABELS: Record<StatusFilter, MessageKey> = {
  all: "common.all",
  live: "manage.product.filterLive",
  hidden: "manage.product.filterHidden",
};

/** Sentinel for "no group filter", alongside the canonical group names. */
const ALL_GROUPS = "__all__";

/**
 * Non-drink categories get one group each; drinks are split further by subtype,
 * because "Drinks" alone would be most of the table.
 */
const NON_DRINK_CATEGORIES = PRODUCT_CATEGORY_ORDER.filter(
  (category) => category !== PRODUCT_CATEGORY.DRINK
);

/** `group` is the canonical category or subtype name, never a heading. */
type Row = { product: Drink; group: string };

function groupOf(product: Drink): string {
  const category = NON_DRINK_CATEGORIES.find((name) =>
    isProductCategory(product.categoryName, name)
  );
  return category ?? drinkSubtypeLabel(product);
}

function statusOf(
  product: Drink,
  t: TranslateFn
): {
  label: string;
  className: string;
} {
  if (product.active !== false) {
    return {
      label: t("manage.product.statusLive"),
      className: "bg-ac-soft text-ac-dark",
    };
  }
  if (product.available_until) {
    return {
      label: t("manage.product.statusBackAtMidnight"),
      className: "bg-warn-soft text-warn",
    };
  }
  return {
    label: t("manage.product.statusHidden"),
    className: "bg-neutral-soft text-muted-foreground",
  };
}

/** Option names are admin-typed rows, so they are listed as they were typed. */
function optionsLabel(product: Drink): string {
  const names = product.availableOptions.map((o) => o.name);
  return names.length ? names.join(", ") : "—";
}

/** Pill used by both filter groups. */
function FilterPill({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "press min-h-[38px] rounded-full px-3.5 text-[13px] font-semibold",
        on
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-ink/5"
      )}
    >
      {label}
    </button>
  );
}

export function ProductTable() {
  const { t } = useTranslation();
  const products = useAppStore((state) => state.products);
  const productsLoading = useAppStore((state) => state.productsLoading);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const deleteProductApi = useAppStore((state) => state.deleteProductApi);
  const reorderProductsApi = useAppStore((state) => state.reorderProductsApi);
  const toggleProductAvailableApi = useAppStore(
    (state) => state.toggleProductAvailableApi
  );
  const subtypeOrder = useDrinkSubtypeOrder();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const rows = useMemo<Row[]>(
    () => products.map((product) => ({ product, group: groupOf(product) })),
    [products]
  );

  const groups = useMemo(() => {
    const present = new Set(rows.map((r) => r.group));
    // Drink subtypes first in their DB order, then any stragglers, then the
    // other top-level categories in the shared order.
    const tail = (NON_DRINK_CATEGORIES as string[]).filter((name) =>
      present.has(name)
    );
    const ordered = subtypeOrder.filter((name) => present.has(name));
    const extra = [...present]
      .filter((name) => !ordered.includes(name) && !tail.includes(name))
      .sort((a, b) => a.localeCompare(b));
    return [ALL_GROUPS, ...ordered, ...extra, ...tail];
  }, [rows, subtypeOrder]);

  /**
   * The table is sorted the way the terminal and the menu board show things —
   * group by group, and inside a group in the cafe's own running order (which
   * is the order `GET /api/products` already returns). Anything else and the
   * move up / move down buttons below would be moving rows against a sequence
   * nobody can see.
   */
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rank = new Map(groups.map((name, index) => [name, index]));
    return rows
      .filter(({ product, group }) => {
        if (groupFilter !== ALL_GROUPS && group !== groupFilter) return false;
        const live = product.active !== false;
        if (statusFilter === "live" && !live) return false;
        if (statusFilter === "hidden" && live) return false;
        if (!needle) return true;
        return (
          product.name.toLowerCase().includes(needle) ||
          (product.description ?? "").toLowerCase().includes(needle)
        );
      })
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const byGroup =
          (rank.get(a.row.group) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b.row.group) ?? Number.MAX_SAFE_INTEGER);
        // Ties keep the order the API sent, which is `sort_order` itself.
        return byGroup !== 0 ? byGroup : a.index - b.index;
      })
      .map(({ row }) => row);
  }, [rows, groups, query, groupFilter, statusFilter]);

  const selectedIds = visibleRows
    .map((r) => r.product.id)
    .filter((id) => selected[id]);
  const allChecked =
    visibleRows.length > 0 && selectedIds.length === visibleRows.length;

  const editingRow = editingId
    ? rows.find((r) => r.product.id === editingId) ?? null
    : null;

  const reload = () => {
    loadProducts();
  };

  async function applyVisibility(
    ids: string[],
    active: boolean,
    untilMidnight?: boolean
  ) {
    setBusy(true);
    try {
      for (const id of ids) {
        await toggleProductAvailableApi(id, active, untilMidnight);
      }
      toast.success(
        ids.length === 1
          ? t("manage.product.visibilityUpdated")
          : t("manage.product.visibilityUpdatedMany", { count: ids.length })
      );
      setSelected({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("manage.product.visibilityFailed");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Swap a product with its neighbour in the same group.
   *
   * Only rows of the same group trade places: the terminal and the menu both
   * group before they list, so swapping a coffee with a dessert would persist
   * an order change nobody could see. The whole sequence is sent to the server
   * (`reorderProductsApi`), not the pair — see the route's note on why.
   */
  async function handleMove(row: Row, direction: -1 | 1) {
    const index = visibleRows.findIndex(
      (candidate) => candidate.product.id === row.product.id
    );
    const neighbour = visibleRows[index + direction];
    if (!neighbour || neighbour.group !== row.group) return;

    const ids = products.map((product) => product.id);
    const from = ids.indexOf(row.product.id);
    const to = ids.indexOf(neighbour.product.id);
    if (from < 0 || to < 0) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];

    setMovingId(row.product.id);
    try {
      await reorderProductsApi(ids);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("manage.product.reorderFailed");
      toast.error(message);
    } finally {
      setMovingId(null);
    }
  }

  /** Whether the row has a neighbour of its own group to trade places with. */
  function canMove(row: Row, direction: -1 | 1): boolean {
    const index = visibleRows.findIndex(
      (candidate) => candidate.product.id === row.product.id
    );
    const neighbour = visibleRows[index + direction];
    return Boolean(neighbour && neighbour.group === row.group);
  }

  async function handleDelete(row: Row) {
    setDeletingId(row.product.id);
    try {
      await deleteProductApi(row.product.id);
      toast.success(t("manage.product.deleted", { name: row.product.name }));
      setToDelete(null);
      if (editingId === row.product.id) setEditingId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("manage.product.deleteFailed");
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (productsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-[420px] w-full rounded-card" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-0.5 text-xl font-extrabold">
            {t("manage.product.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("manage.product.subtitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("manage.product.orderHint")}
          </p>
        </div>
        <AddProductDialog />
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Input
          placeholder={t("manage.product.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("manage.product.searchLabel")}
          className="h-[46px] min-w-[220px] flex-1 rounded-full"
        />
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
          {groups.map((name) => (
            <FilterPill
              key={name}
              label={name === ALL_GROUPS ? t("common.all") : groupLabel(name, t)}
              on={groupFilter === name}
              onClick={() => setGroupFilter(name)}
            />
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {STATUS_FILTERS.map((name) => (
            <FilterPill
              key={name}
              label={t(STATUS_FILTER_LABELS[name])}
              on={statusFilter === name}
              onClick={() => setStatusFilter(name)}
            />
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="enter mb-3.5 flex flex-wrap items-center gap-2.5 rounded-ctl bg-ac-soft px-4 py-3">
          <span className="num text-sm font-bold text-ac-dark">
            {t("common.selectedCount", { count: selectedIds.length })}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, true)}
            title={t("manage.product.showTooltip")}
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            {t("common.show")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, false)}
            title={t("manage.product.hideTooltip")}
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            {t("common.hide")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, false, true)}
            title={t("manage.product.hideTillMidnightTooltip")}
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            {t("manage.product.hideTillMidnight")}
          </button>
          <button
            type="button"
            onClick={() => setSelected({})}
            className="press min-h-10 rounded-full px-3.5 text-sm font-semibold text-ac-dark"
          >
            {t("common.deselect")}
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid items-start gap-[18px]",
          editingRow ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"
        )}
      >
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted-foreground">
                <th className="w-[42px] p-3.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    aria-label={t("manage.product.selectAllInView")}
                    onChange={(e) => {
                      const next = { ...selected };
                      for (const row of visibleRows) {
                        next[row.product.id] = e.target.checked;
                      }
                      setSelected(next);
                    }}
                    className="h-[18px] w-[18px] accent-[rgb(var(--ac))]"
                  />
                </th>
                <th className="p-3.5">{t("manage.product.columnProduct")}</th>
                <th className="p-3.5">{t("manage.product.columnGroup")}</th>
                <th className="p-3.5 text-right">{t("common.price")}</th>
                <th className="p-3.5">{t("manage.product.columnOptions")}</th>
                <th className="p-3.5">{t("common.status")}</th>
                {/* Move up / move down / visibility / edit */}
                <th className="w-[164px] p-3.5 text-right">
                  {t("manage.product.columnArrange")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const { product } = row;
                const status = statusOf(product, t);
                const isEditing = editingId === product.id;
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      "row-hover border-t border-line",
                      isEditing && "bg-ac-soft/50"
                    )}
                  >
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[product.id])}
                        aria-label={t("manage.product.selectNamed", {
                          name: product.name,
                        })}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [product.id]: e.target.checked,
                          }))
                        }
                        className="h-[18px] w-[18px] accent-[rgb(var(--ac))]"
                      />
                    </td>
                    <td
                      className="cursor-pointer p-3.5"
                      onClick={() => setEditingId(product.id)}
                    >
                      <div className="text-[15px] font-bold">
                        {product.name}
                      </div>
                      {product.description ? (
                        <div className="text-xs text-muted-foreground">
                          {product.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {groupLabel(row.group, t)}
                    </td>
                    <td className="num p-3.5 text-right font-semibold">
                      {formatPrice(product.price)}
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">
                      {optionsLabel(product)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-[5px] text-xs font-semibold",
                          status.className
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          disabled={
                            movingId !== null || !canMove(row, -1)
                          }
                          onClick={() => handleMove(row, -1)}
                          title={t("manage.product.moveUp")}
                          aria-label={t("manage.product.moveUpNamed", {
                            name: product.name,
                          })}
                          className="press flex h-9 w-9 items-center justify-center rounded-[11px] text-muted-foreground hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronUp className="h-[17px] w-[17px]" />
                        </button>
                        <button
                          type="button"
                          disabled={movingId !== null || !canMove(row, 1)}
                          onClick={() => handleMove(row, 1)}
                          title={t("manage.product.moveDown")}
                          aria-label={t("manage.product.moveDownNamed", {
                            name: product.name,
                          })}
                          className="press flex h-9 w-9 items-center justify-center rounded-[11px] text-muted-foreground hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronDown className="h-[17px] w-[17px]" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            applyVisibility(
                              [product.id],
                              product.active === false
                            )
                          }
                          title={
                            product.active === false
                              ? t("manage.product.showTooltip")
                              : t("manage.product.hideTooltip")
                          }
                          aria-label={t(
                            "manage.product.toggleVisibilityNamed",
                            { name: product.name }
                          )}
                          className="press flex h-9 w-9 items-center justify-center rounded-[11px] text-muted-foreground hover:bg-ink/5 disabled:opacity-50"
                        >
                          {product.active === false ? (
                            <EyeOff className="h-[17px] w-[17px]" />
                          ) : (
                            <Eye className="h-[17px] w-[17px]" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(product.id)}
                          title={t("manage.product.editDetails")}
                          aria-label={t("manage.product.editNamed", {
                            name: product.name,
                          })}
                          className="press flex h-9 w-9 items-center justify-center rounded-[11px] text-muted-foreground hover:bg-ink/5"
                        >
                          <Pencil className="h-[17px] w-[17px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr className="border-t border-line">
                  <td
                    colSpan={7}
                    className="p-8 text-center text-sm text-muted-foreground"
                  >
                    {t("manage.product.noMatches")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingRow ? (
          <div className="enter rounded-card border border-line bg-surface p-5 shadow-card lg:sticky lg:top-[88px]">
            <div className="mb-3.5 flex items-start justify-between gap-2.5">
              <h3 className="text-[17px] font-extrabold">
                {editingRow.product.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                aria-label={t("manage.product.closePanel")}
                title={t("manage.product.closePanel")}
                className="press flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-muted-foreground hover:bg-ink/5"
              >
                <X className="h-[17px] w-[17px]" />
              </button>
            </div>
            <ProductForm
              key={editingRow.product.id}
              product={editingRow.product}
              onSuccess={() => {
                setEditingId(null);
                reload();
              }}
            />
            <div className="mt-3.5 border-t border-line pt-3.5">
              <button
                type="button"
                onClick={() => setToDelete(editingRow)}
                title={t("manage.product.deletePermanently")}
                className="press min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-warn hover:bg-warn-soft"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("manage.product.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.product.deleteBody", {
                name: toDelete?.product.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId === toDelete?.product.id}
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              {deletingId === toDelete?.product.id
                ? t("common.deleting")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
