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
import { Eye, EyeOff, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { drinkSubtypeLabel } from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";

/**
 * Everything on sale in one searchable table, with the editor as a panel
 * beside it — the canvas' Manage → Products tab. Bulk visibility lives in a
 * bar that only appears once rows are ticked.
 */

const DESSERTS_GROUP = "Desserts";
type StatusFilter = "All" | "Live" | "Hidden";
const STATUS_FILTERS: StatusFilter[] = ["All", "Live", "Hidden"];

type Row = { product: Drink; group: string; isDessert: boolean };

function statusOf(product: Drink): {
  label: string;
  className: string;
} {
  if (product.active !== false) {
    return { label: "Live", className: "bg-ac-soft text-ac-dark" };
  }
  if (product.available_until) {
    return { label: "Back at midnight", className: "bg-warn-soft text-warn" };
  }
  return {
    label: "Hidden",
    className: "bg-neutral-soft text-muted-foreground",
  };
}

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
  const drinks = useAppStore((state) => state.drinks);
  const desserts = useAppStore((state) => state.desserts);
  const drinksLoading = useAppStore((state) => state.drinksLoading);
  const dessertsLoading = useAppStore((state) => state.dessertsLoading);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const loadDesserts = useAppStore((state) => state.loadDesserts);
  const deleteDrinkApi = useAppStore((state) => state.deleteDrinkApi);
  const deleteDessertApi = useAppStore((state) => state.deleteDessertApi);
  const toggleProductAvailableApi = useAppStore(
    (state) => state.toggleProductAvailableApi
  );
  const subtypeOrder = useDrinkSubtypeOrder();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDrinks();
    loadDesserts();
  }, [loadDrinks, loadDesserts]);

  const rows = useMemo<Row[]>(() => {
    const drinkRows = drinks.map((product) => ({
      product,
      group: drinkSubtypeLabel(product),
      isDessert: false,
    }));
    const dessertRows = desserts.map((product) => ({
      product,
      group: DESSERTS_GROUP,
      isDessert: true,
    }));
    return [...drinkRows, ...dessertRows];
  }, [drinks, desserts]);

  const groups = useMemo(() => {
    const present = new Set(rows.map((r) => r.group));
    const ordered = subtypeOrder.filter((name) => present.has(name));
    const extra = [...present]
      .filter((name) => !ordered.includes(name) && name !== DESSERTS_GROUP)
      .sort((a, b) => a.localeCompare(b));
    const tail = present.has(DESSERTS_GROUP) ? [DESSERTS_GROUP] : [];
    return ["All", ...ordered, ...extra, ...tail];
  }, [rows, subtypeOrder]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(({ product, group }) => {
      if (groupFilter !== "All" && group !== groupFilter) return false;
      const live = product.active !== false;
      if (statusFilter === "Live" && !live) return false;
      if (statusFilter === "Hidden" && live) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, query, groupFilter, statusFilter]);

  const selectedIds = visibleRows
    .map((r) => r.product.id)
    .filter((id) => selected[id]);
  const allChecked =
    visibleRows.length > 0 && selectedIds.length === visibleRows.length;

  const editingRow = editingId
    ? rows.find((r) => r.product.id === editingId) ?? null
    : null;

  const reload = () => {
    loadDrinks();
    loadDesserts();
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
          ? "Visibility updated"
          : `${ids.length} products updated`
      );
      setSelected({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update visibility";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: Row) {
    setDeletingId(row.product.id);
    try {
      if (row.isDessert) {
        await deleteDessertApi(row.product.id);
      } else {
        await deleteDrinkApi(row.product.id);
      }
      toast.success(`"${row.product.name}" deleted`);
      setToDelete(null);
      if (editingId === row.product.id) setEditingId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete product";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (drinksLoading || dessertsLoading) {
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
          <h2 className="mb-0.5 text-xl font-extrabold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Search, then edit in the panel beside the list.
          </p>
        </div>
        <AddProductDialog />
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Input
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
          className="h-[46px] min-w-[220px] flex-1 rounded-full"
        />
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
          {groups.map((name) => (
            <FilterPill
              key={name}
              label={name}
              on={groupFilter === name}
              onClick={() => setGroupFilter(name)}
            />
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {STATUS_FILTERS.map((name) => (
            <FilterPill
              key={name}
              label={name}
              on={statusFilter === name}
              onClick={() => setStatusFilter(name)}
            />
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="enter mb-3.5 flex flex-wrap items-center gap-2.5 rounded-ctl bg-ac-soft px-4 py-3">
          <span className="num text-sm font-bold text-ac-dark">
            {selectedIds.length} selected
          </span>
          <span className="flex-1" />
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, true)}
            title="Put back on the menu"
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            Show
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, false)}
            title="Hide from menu and terminal"
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            Hide
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyVisibility(selectedIds, false, true)}
            title="Comes back automatically at midnight"
            className="press min-h-10 rounded-full border border-ac-mid bg-surface px-4 text-sm font-semibold text-ac-dark disabled:opacity-50"
          >
            Hide till midnight
          </button>
          <button
            type="button"
            onClick={() => setSelected({})}
            className="press min-h-10 rounded-full px-3.5 text-sm font-semibold text-ac-dark"
          >
            Deselect
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
                    aria-label="Select everything in view"
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
                <th className="p-3.5">Product</th>
                <th className="p-3.5">Group</th>
                <th className="p-3.5 text-right">Price</th>
                <th className="p-3.5">Options</th>
                <th className="p-3.5">Status</th>
                <th className="w-[84px] p-3.5" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const { product } = row;
                const status = statusOf(product);
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
                        aria-label={`Select ${product.name}`}
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
                    <td className="p-3.5 text-muted-foreground">{row.group}</td>
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
                          disabled={busy}
                          onClick={() =>
                            applyVisibility(
                              [product.id],
                              product.active === false
                            )
                          }
                          title={
                            product.active === false
                              ? "Put back on the menu"
                              : "Hide from menu and terminal"
                          }
                          aria-label={`Toggle visibility for ${product.name}`}
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
                          title="Edit details"
                          aria-label={`Edit ${product.name}`}
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
                    Nothing matches those filters.
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
                aria-label="Close panel"
                title="Close panel"
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
                title="Delete permanently"
                className="press min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-warn hover:bg-warn-soft"
              >
                Delete
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
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{toDelete?.product.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId === toDelete?.product.id}
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              {deletingId === toDelete?.product.id ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
