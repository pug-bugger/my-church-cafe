"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { DrinkOptionDefinitionApi } from "@/lib/drinkOptions";
import { toast } from "sonner";
import { PlusIcon, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

type NewValueRow = { label: string; extra_price: string };

/**
 * Parse a price typed into an admin field. Returns null when it isn't a usable
 * amount, so the caller can refuse to save rather than quietly storing NaN or a
 * negative — these numbers are charged to customers.
 */
function parsePrice(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function DrinkOptionManagement() {
  const [list, setList] = useState<DrinkOptionDefinitionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"checkbox" | "select">("select");
  const [checkboxExtra, setCheckboxExtra] = useState("0");
  const [valueRows, setValueRows] = useState<NewValueRow[]>([
    { label: "", extra_price: "0" },
  ]);
  const [deleteTarget, setDeleteTarget] =
    useState<DrinkOptionDefinitionApi | null>(null);
  const [newValueByDef, setNewValueByDef] = useState<
    Record<number, NewValueRow>
  >({});
  // Price edits are held as drafts keyed by row id and saved explicitly. These
  // are amounts customers get charged, so no save-on-blur.
  const [valuePriceDraft, setValuePriceDraft] = useState<
    Record<number, string>
  >({});
  const [checkboxPriceDraft, setCheckboxPriceDraft] = useState<
    Record<number, string>
  >({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const load = useCallback(async () => {
    if (!apiUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<DrinkOptionDefinitionApi[]>(
        "/api/drink-options",
        { auth: false }
      );
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load drink options");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (type === "select") {
      const labels = valueRows.map((r) => r.label.trim()).filter(Boolean);
      if (!labels.length) {
        toast.error("Add at least one choice for a picklist option");
        return;
      }
    }
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
        checkbox_extra_price:
          type === "checkbox" ? Number(checkboxExtra) || 0 : 0,
      };
      if (type === "select") {
        body.values = valueRows
          .filter((r) => r.label.trim())
          .map((r, i) => ({
            label: r.label.trim(),
            extra_price: Number(r.extra_price) || 0,
            sort_order: i,
          }));
      }
      await apiFetch("/api/drink-options", {
        method: "POST",
        body,
        auth: true,
      });
      toast.success("Option created");
      setName("");
      setCheckboxExtra("0");
      setValueRows([{ label: "", extra_price: "0" }]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/drink-options/${deleteTarget.id}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success("Option deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function addValueToDefinition(def: DrinkOptionDefinitionApi) {
    const row = newValueByDef[def.id] ?? { label: "", extra_price: "0" };
    if (!row.label.trim()) {
      toast.error("Enter a label");
      return;
    }
    try {
      await apiFetch(`/api/drink-options/${def.id}/values`, {
        method: "POST",
        body: {
          label: row.label.trim(),
          extra_price: Number(row.extra_price) || 0,
        },
        auth: true,
      });
      toast.success("Choice added");
      setNewValueByDef((prev) => ({
        ...prev,
        [def.id]: { label: "", extra_price: "0" },
      }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function removeValue(valueId: number) {
    try {
      await apiFetch(`/api/drink-options/values/${valueId}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success("Choice removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  /** Change what one choice of a select option adds to the price. */
  async function saveValuePrice(valueId: number, raw: string) {
    const extra_price = parsePrice(raw);
    if (extra_price === null) {
      toast.error("Enter a price of 0 or more");
      return;
    }
    setSavingPriceId(`value-${valueId}`);
    try {
      await apiFetch(`/api/drink-options/values/${valueId}`, {
        method: "PUT",
        body: { extra_price },
        auth: true,
        authError: "Login required to change option prices",
      });
      toast.success("Price updated");
      setValuePriceDraft((prev) => {
        const next = { ...prev };
        delete next[valueId];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingPriceId(null);
    }
  }

  /** Change what ticking a checkbox option adds to the price. */
  async function saveCheckboxPrice(defId: number, raw: string) {
    const checkbox_extra_price = parsePrice(raw);
    if (checkbox_extra_price === null) {
      toast.error("Enter a price of 0 or more");
      return;
    }
    setSavingPriceId(`def-${defId}`);
    try {
      await apiFetch(`/api/drink-options/${defId}`, {
        method: "PUT",
        body: { checkbox_extra_price },
        auth: true,
        authError: "Login required to change option prices",
      });
      toast.success("Price updated");
      setCheckboxPriceDraft((prev) => {
        const next = { ...prev };
        delete next[defId];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingPriceId(null);
    }
  }

  if (!apiUrl) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-extrabold">Options</h2>
        <p className="text-sm text-muted-foreground">
          Set NEXT_PUBLIC_API_URL to manage catalog options.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-1 text-xl font-extrabold">Options</h2>
        <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          An option is a question the barista answers when adding a drink — a
          toggle like Take away, or a picklist like Milk. Build it once here,
          then tick it on any product.
        </p>
      </div>
      <div className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="opt-name">Option label</Label>
            <Input
              id="opt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Take away, Milk"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "checkbox" | "select")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkbox">
                  Checkbox (on / off)
                </SelectItem>
                <SelectItem value="select">Picklist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "checkbox" && (
            <div className="space-y-2">
              <Label htmlFor="opt-chk-extra">
                Extra price when checked
              </Label>
              <Input
                id="opt-chk-extra"
                type="number"
                step="0.01"
                min="0"
                value={checkboxExtra}
                onChange={(e) => setCheckboxExtra(e.target.value)}
              />
            </div>
          )}
          {type === "select" && (
            <div className="space-y-2">
              <Label>Choices</Label>
              {valueRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <Input
                    placeholder="Label (e.g. Oat milk)"
                    value={row.label}
                    onChange={(e) => {
                      const next = [...valueRows];
                      next[i] = { ...next[i], label: e.target.value };
                      setValueRows(next);
                    }}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    step="0.01"
                    placeholder="Extra $"
                    value={row.extra_price}
                    onChange={(e) => {
                      const next = [...valueRows];
                      next[i] = {
                        ...next[i],
                        extra_price: e.target.value,
                      };
                      setValueRows(next);
                    }}
                  />
                  {valueRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setValueRows(valueRows.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setValueRows([
                    ...valueRows,
                    { label: "", extra_price: "0" },
                  ])
                }
              >
                <PlusIcon className="h-4 w-4" />
                Add choice
              </Button>
            </div>
          )}
          <Button type="submit">Create option</Button>
        </form>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-3">Catalog</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No options yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-4">
              {list.map((def) => (
                <li
                  key={def.id}
                  className="rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{def.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {def.option_key} · {def.type}
                    </p>
                    {def.type === "checkbox" && (
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <div>
                          <Label
                            htmlFor={`chk-price-${def.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Extra when on
                          </Label>
                          <Input
                            id={`chk-price-${def.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1 w-28"
                            value={
                              checkboxPriceDraft[def.id] ??
                              String(def.checkbox_extra_price ?? 0)
                            }
                            onChange={(e) =>
                              setCheckboxPriceDraft((prev) => ({
                                ...prev,
                                [def.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            checkboxPriceDraft[def.id] === undefined ||
                            savingPriceId === `def-${def.id}`
                          }
                          onClick={() =>
                            saveCheckboxPrice(
                              def.id,
                              checkboxPriceDraft[def.id] ?? ""
                            )
                          }
                        >
                          {savingPriceId === `def-${def.id}` ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    )}
                    {def.type === "select" && def.values.length > 0 && (
                      <ul className="mt-2 text-sm list-disc list-inside">
                        {def.values.map((v) => (
                          <li
                            key={v.id}
                            className="flex items-center gap-2 flex-wrap mb-2"
                          >
                            <span>{v.label}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24"
                              aria-label={`Extra price for ${v.label}`}
                              value={
                                valuePriceDraft[v.id] ?? String(v.extra_price ?? 0)
                              }
                              onChange={(e) =>
                                setValuePriceDraft((prev) => ({
                                  ...prev,
                                  [v.id]: e.target.value,
                                }))
                              }
                            />
                            {valuePriceDraft[v.id] === undefined ? (
                              <span className="text-xs text-muted-foreground">
                                {v.extra_price > 0
                                  ? `+${formatPrice(v.extra_price)}`
                                  : "no extra"}
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingPriceId === `value-${v.id}`}
                                onClick={() =>
                                  saveValuePrice(v.id, valuePriceDraft[v.id] ?? "")
                                }
                              >
                                {savingPriceId === `value-${v.id}`
                                  ? "Saving…"
                                  : "Save"}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-5 w-5 rounded-full p-0 text-destructive"
                              aria-label={`Remove ${v.label}`}
                              onClick={() => removeValue(v.id)}
                            >
                              -
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {def.type === "select" && (
                      <div className="mt-3 flex flex-wrap gap-2 items-end">
                        <Input
                          placeholder="New choice label"
                          className="max-w-xs"
                          value={newValueByDef[def.id]?.label ?? ""}
                          onChange={(e) =>
                            setNewValueByDef((prev) => ({
                              ...prev,
                              [def.id]: {
                                extra_price:
                                  prev[def.id]?.extra_price ?? "0",
                                label: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          className="w-24"
                          type="number"
                          step="0.01"
                          placeholder="Extra"
                          value={
                            newValueByDef[def.id]?.extra_price ?? "0"
                          }
                          onChange={(e) =>
                            setNewValueByDef((prev) => ({
                              ...prev,
                              [def.id]: {
                                label: prev[def.id]?.label ?? "",
                                extra_price: e.target.value,
                              },
                            }))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => addValueToDefinition(def)}
                        >
                          Add choice
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={() => setDeleteTarget(def)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete option</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteTarget?.name}&quot; from the catalog? Products
              that use it will lose this assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
