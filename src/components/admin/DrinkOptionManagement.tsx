"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ??
    localStorage.getItem("jwt") ??
    localStorage.getItem("accessToken")
  );
}

type NewValueRow = { label: string; extra_price: string };

export function DrinkOptionManagement() {
  const [list, setList] = useState<DrinkOptionDefinitionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"checkbox" | "select">("select");
  const [checkboxExtra, setCheckboxExtra] = useState("0");
  const [valueRows, setValueRows] = useState<NewValueRow[]>([
    { label: "", extra_price: "0" },
  ]);
  const [deleteTarget, setDeleteTarget] = useState<DrinkOptionDefinitionApi | null>(null);
  const [newValueByDef, setNewValueByDef] = useState<Record<number, NewValueRow>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const load = useCallback(async () => {
    if (!apiUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/drink-options`);
      if (!res.ok) throw new Error("Failed to load options");
      const data = await res.json();
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
    const token = getAuthToken();
    if (!token) {
      toast.error("Login required");
      return;
    }
    if (!apiUrl) {
      toast.error("NEXT_PUBLIC_API_URL is not set");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (type === "select") {
      const labels = valueRows
        .map((r) => r.label.trim())
        .filter(Boolean);
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
      const res = await fetch(`${apiUrl}/api/drink-options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to create");
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
    if (!deleteTarget || !apiUrl) return;
    const token = getAuthToken();
    if (!token) {
      toast.error("Login required");
      return;
    }
    try {
      const res = await fetch(
        `${apiUrl}/api/drink-options/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to delete");
      }
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
    const token = getAuthToken();
    if (!token || !apiUrl) {
      toast.error("Login required");
      return;
    }
    try {
      const res = await fetch(
        `${apiUrl}/api/drink-options/${def.id}/values`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: row.label.trim(),
            extra_price: Number(row.extra_price) || 0,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to add value");
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
    const token = getAuthToken();
    if (!token || !apiUrl) {
      toast.error("Login required");
      return;
    }
    try {
      const res = await fetch(
        `${apiUrl}/api/drink-options/values/${valueId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to delete");
      }
      toast.success("Choice removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!apiUrl) {
    return (
      <Card className="mb-8 border-dashed">
        <CardHeader>
          <CardTitle>Reusable drink options</CardTitle>
          <CardDescription>
            Set NEXT_PUBLIC_API_URL to manage catalog options.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Reusable drink options</CardTitle>
          <CardDescription>
            Create options here first (e.g. &quot;Take away&quot; checkbox or
            &quot;Milk&quot; picklist), then attach them to drinks when editing a
            product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <SelectItem value="checkbox">Checkbox (on / off)</SelectItem>
                  <SelectItem value="select">Picklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "checkbox" && (
              <div className="space-y-2">
                <Label htmlFor="opt-chk-extra">Extra price when checked</Label>
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
                        next[i] = { ...next[i], extra_price: e.target.value };
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
                    setValueRows([...valueRows, { label: "", extra_price: "0" }])
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
                        {def.type === "checkbox" &&
                          def.checkbox_extra_price > 0 && (
                            <span>
                              {" "}
                              · +${def.checkbox_extra_price.toFixed(2)} when on
                            </span>
                          )}
                      </p>
                      {def.type === "select" && def.values.length > 0 && (
                        <ul className="mt-2 text-sm list-disc list-inside">
                          {def.values.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <span>
                                {v.label}
                                {v.extra_price > 0 && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    (+${v.extra_price.toFixed(2)})
                                  </span>
                                )}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive"
                                onClick={() => removeValue(v.id)}
                              >
                                Remove
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
                            value={newValueByDef[def.id]?.extra_price ?? "0"}
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
        </CardContent>
      </Card>

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
