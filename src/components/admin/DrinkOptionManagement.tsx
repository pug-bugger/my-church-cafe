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
import type {
  DrinkOptionDefinitionApi,
  DrinkOptionValueApi,
} from "@/lib/drinkOptions";
import { toast } from "sonner";
import { PlusIcon, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/i18n";
import { formatPrice } from "@/lib/format";

type NewValueRow = { label: string; extra_price: string; is_default?: boolean };

/** The empty add-a-choice form. A function so every reset gets a fresh object. */
const emptyValueRow = (): NewValueRow => ({
  label: "",
  extra_price: "0",
  is_default: false,
});

/** A choice queued for removal, with the option it belongs to (for the prompt). */
type ValueToDelete = {
  value: DrinkOptionValueApi;
  definition: DrinkOptionDefinitionApi;
};

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
  const { t } = useTranslation();
  const [list, setList] = useState<DrinkOptionDefinitionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"checkbox" | "select">("select");
  const [checkboxExtra, setCheckboxExtra] = useState("0");
  const [checkboxDefault, setCheckboxDefault] = useState(false);
  const [valueRows, setValueRows] = useState<NewValueRow[]>([emptyValueRow()]);
  const [deleteTarget, setDeleteTarget] =
    useState<DrinkOptionDefinitionApi | null>(null);
  const [valueToDelete, setValueToDelete] = useState<ValueToDelete | null>(null);
  const [removingValueId, setRemovingValueId] = useState<number | null>(null);
  /**
   * Which option has its add-a-choice panel open, and what has been typed into
   * it. One draft rather than one per option: closing the panel — or opening a
   * different option's — throws the half-typed choice away, so reopening never
   * hands back a label the admin already decided against.
   */
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [newValue, setNewValue] = useState<NewValueRow>(emptyValueRow());
  // Price edits are held as drafts keyed by row id and saved explicitly. These
  // are amounts customers get charged, so no save-on-blur.
  const [valuePriceDraft, setValuePriceDraft] = useState<
    Record<number, string>
  >({});
  const [checkboxPriceDraft, setCheckboxPriceDraft] = useState<
    Record<number, string>
  >({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [savingDefaultId, setSavingDefaultId] = useState<string | null>(null);

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
      toast.error(t("manage.option.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    load();
  }, [load]);

  /** Open the add-a-choice panel on one option, always with empty fields. */
  function openAddChoice(defId: number) {
    setNewValue(emptyValueRow());
    setAddingFor(defId);
  }

  /** Close it and drop whatever was typed but never added. */
  function closeAddChoice() {
    setAddingFor(null);
    setNewValue(emptyValueRow());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("manage.option.nameRequired"));
      return;
    }
    if (type === "select") {
      const labels = valueRows.map((r) => r.label.trim()).filter(Boolean);
      if (!labels.length) {
        toast.error(t("manage.option.needOneChoice"));
        return;
      }
    }
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
        checkbox_extra_price:
          type === "checkbox" ? Number(checkboxExtra) || 0 : 0,
        checkbox_default: type === "checkbox" ? checkboxDefault : false,
      };
      if (type === "select") {
        body.values = valueRows
          .filter((r) => r.label.trim())
          .map((r, i) => ({
            label: r.label.trim(),
            extra_price: Number(r.extra_price) || 0,
            is_default: Boolean(r.is_default),
            sort_order: i,
          }));
      }
      await apiFetch("/api/drink-options", {
        method: "POST",
        body,
        auth: true,
      });
      toast.success(t("manage.option.created"));
      setName("");
      setCheckboxExtra("0");
      setCheckboxDefault(false);
      setValueRows([emptyValueRow()]);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.createFailed")
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/drink-options/${deleteTarget.id}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success(t("manage.option.deleted"));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.deleteFailed")
      );
    }
  }

  async function addValueToDefinition(def: DrinkOptionDefinitionApi) {
    if (!newValue.label.trim()) {
      toast.error(t("manage.option.enterLabel"));
      return;
    }
    try {
      await apiFetch(`/api/drink-options/${def.id}/values`, {
        method: "POST",
        body: {
          label: newValue.label.trim(),
          extra_price: Number(newValue.extra_price) || 0,
          is_default: Boolean(newValue.is_default),
        },
        auth: true,
      });
      toast.success(t("manage.option.choiceAdded"));
      closeAddChoice();
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    }
  }

  async function removeValue() {
    if (!valueToDelete) return;
    const valueId = valueToDelete.value.id;
    setRemovingValueId(valueId);
    try {
      await apiFetch(`/api/drink-options/values/${valueId}`, {
        method: "DELETE",
        auth: true,
      });
      toast.success(t("manage.option.choiceRemoved"));
      setValueToDelete(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    } finally {
      setRemovingValueId(null);
    }
  }

  /**
   * Make one choice the answer the terminal opens on — or clear it, which puts
   * the option back to opening on its first choice. Not money, so it saves on
   * the click rather than behind a Save button like the prices do.
   */
  async function setValueDefault(valueId: number, isDefault: boolean) {
    setSavingDefaultId(`value-${valueId}`);
    try {
      await apiFetch(`/api/drink-options/values/${valueId}`, {
        method: "PUT",
        body: { is_default: isDefault },
        auth: true,
        authError: t("manage.option.loginRequiredForPrices"),
      });
      toast.success(t("manage.option.defaultUpdated"));
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    } finally {
      setSavingDefaultId(null);
    }
  }

  /** Whether a checkbox option opens already ticked. */
  async function setCheckboxDefaultFor(defId: number, isDefault: boolean) {
    setSavingDefaultId(`def-${defId}`);
    try {
      await apiFetch(`/api/drink-options/${defId}`, {
        method: "PUT",
        body: { checkbox_default: isDefault },
        auth: true,
        authError: t("manage.option.loginRequiredForPrices"),
      });
      toast.success(t("manage.option.defaultUpdated"));
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    } finally {
      setSavingDefaultId(null);
    }
  }

  /** Change what one choice of a select option adds to the price. */
  async function saveValuePrice(valueId: number, raw: string) {
    const extra_price = parsePrice(raw);
    if (extra_price === null) {
      toast.error(t("manage.option.enterValidPrice"));
      return;
    }
    setSavingPriceId(`value-${valueId}`);
    try {
      await apiFetch(`/api/drink-options/values/${valueId}`, {
        method: "PUT",
        body: { extra_price },
        auth: true,
        authError: t("manage.option.loginRequiredForPrices"),
      });
      toast.success(t("manage.option.priceUpdated"));
      setValuePriceDraft((prev) => {
        const next = { ...prev };
        delete next[valueId];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    } finally {
      setSavingPriceId(null);
    }
  }

  /** Change what ticking a checkbox option adds to the price. */
  async function saveCheckboxPrice(defId: number, raw: string) {
    const checkbox_extra_price = parsePrice(raw);
    if (checkbox_extra_price === null) {
      toast.error(t("manage.option.enterValidPrice"));
      return;
    }
    setSavingPriceId(`def-${defId}`);
    try {
      await apiFetch(`/api/drink-options/${defId}`, {
        method: "PUT",
        body: { checkbox_extra_price },
        auth: true,
        authError: t("manage.option.loginRequiredForPrices"),
      });
      toast.success(t("manage.option.priceUpdated"));
      setCheckboxPriceDraft((prev) => {
        const next = { ...prev };
        delete next[defId];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("manage.option.actionFailed")
      );
    } finally {
      setSavingPriceId(null);
    }
  }

  if (!apiUrl) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-extrabold">
          {t("manage.option.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("manage.option.unavailable")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-1 text-xl font-extrabold">
          {t("manage.option.title")}
        </h2>
        <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          {t("manage.option.subtitle")}
        </p>
      </div>
      <div className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="opt-name">{t("manage.option.label")}</Label>
            <Input
              id="opt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("manage.option.labelPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("manage.option.type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "checkbox" | "select")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkbox">
                  {t("manage.option.typeCheckbox")}
                </SelectItem>
                <SelectItem value="select">
                  {t("manage.option.typeSelect")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "checkbox" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="opt-chk-extra">
                  {t("manage.option.checkboxExtra")}
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
              <div className="flex items-start gap-2.5">
                <input
                  id="opt-chk-default"
                  type="checkbox"
                  checked={checkboxDefault}
                  onChange={(e) => setCheckboxDefault(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] accent-[rgb(var(--ac))]"
                />
                <div>
                  <Label htmlFor="opt-chk-default">
                    {t("manage.option.opensTicked")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("manage.option.opensTickedHint")}
                  </p>
                </div>
              </div>
            </>
          )}
          {type === "select" && (
            <div className="space-y-2">
              <Label>{t("manage.option.choices")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("manage.option.defaultChoiceHint")}
              </p>
              {valueRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder={t("manage.option.choiceLabelPlaceholder")}
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
                    placeholder={t("manage.option.extraPlaceholder")}
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
                  {/* An option has at most one default, so ticking a row
                      unticks the rest — the same rule the server enforces —
                      but unlike a radio group this can be cleared again. */}
                  <label className="flex flex-none items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(row.is_default)}
                      onChange={(e) =>
                        setValueRows(
                          valueRows.map((r, j) => ({
                            ...r,
                            is_default: e.target.checked && i === j,
                          }))
                        )
                      }
                      className="h-4 w-4 accent-[rgb(var(--ac))]"
                    />
                    {t("manage.option.defaultChoice")}
                  </label>
                  {valueRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("manage.option.removeRow")}
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
                onClick={() => setValueRows([...valueRows, emptyValueRow()])}
              >
                <PlusIcon className="h-4 w-4" />
                {t("manage.option.addChoice")}
              </Button>
            </div>
          )}
          <Button type="submit">{t("manage.option.createOption")}</Button>
        </form>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-3">
            {t("manage.option.catalog")}
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("manage.option.noOptionsYet")}
            </p>
          ) : (
            <ul className="space-y-4">
              {list.map((def) => (
                <li
                  key={def.id}
                  className="rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{def.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {def.option_key} · {def.type}
                    </p>
                    {def.type === "checkbox" && (
                      <>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <div>
                            <Label
                              htmlFor={`chk-price-${def.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              {t("manage.option.extraWhenOn")}
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
                            {savingPriceId === `def-${def.id}`
                              ? t("common.saving")
                              : t("common.save")}
                          </Button>
                        </div>
                        <label className="mt-2.5 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(def.checkbox_default)}
                            disabled={savingDefaultId === `def-${def.id}`}
                            onChange={(e) =>
                              setCheckboxDefaultFor(def.id, e.target.checked)
                            }
                            className="h-[18px] w-[18px] accent-[rgb(var(--ac))]"
                          />
                          <span className="text-muted-foreground">
                            {t("manage.option.opensTicked")}
                          </span>
                        </label>
                      </>
                    )}
                    {def.type === "select" && def.values.length > 0 && (
                      <ul className="mt-2 space-y-2 text-sm">
                        {def.values.map((v) => (
                          <li
                            key={v.id}
                            className="flex items-center gap-2 flex-wrap"
                          >
                            <span>{v.label}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24"
                              aria-label={t("manage.option.extraPriceFor", {
                                label: v.label,
                              })}
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
                                  : t("manage.option.noExtra")}
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
                                  ? t("common.saving")
                                  : t("common.save")}
                              </Button>
                            )}
                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(v.is_default)}
                                disabled={savingDefaultId === `value-${v.id}`}
                                onChange={(e) =>
                                  setValueDefault(v.id, e.target.checked)
                                }
                                className="h-4 w-4 accent-[rgb(var(--ac))]"
                                aria-label={t("manage.option.defaultChoiceFor", {
                                  label: v.label,
                                })}
                              />
                              {t("manage.option.defaultChoice")}
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 rounded-full p-0 text-destructive"
                              aria-label={t("manage.option.removeNamed", {
                                label: v.label,
                              })}
                              onClick={() =>
                                setValueToDelete({ value: v, definition: def })
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {def.type === "select" && (
                      <div className="mt-3">
                        {addingFor === def.id ? (
                          /* Its own panel, set apart from the rows above: these
                             fields create a choice, they don't edit one. */
                          <div className="rounded-lg border border-dashed bg-muted/40 p-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">
                              {t("manage.option.newChoiceHeading")}
                            </p>
                            <div className="flex flex-wrap items-end gap-2">
                              <Input
                                autoFocus
                                placeholder={t(
                                  "manage.option.newChoicePlaceholder"
                                )}
                                className="max-w-xs"
                                value={newValue.label}
                                onChange={(e) =>
                                  setNewValue((prev) => ({
                                    ...prev,
                                    label: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                className="w-24"
                                type="number"
                                step="0.01"
                                placeholder={t("manage.option.extraShort")}
                                aria-label={t("manage.option.extraShort")}
                                value={newValue.extra_price}
                                onChange={(e) =>
                                  setNewValue((prev) => ({
                                    ...prev,
                                    extra_price: e.target.value,
                                  }))
                                }
                              />
                              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={Boolean(newValue.is_default)}
                                  onChange={(e) =>
                                    setNewValue((prev) => ({
                                      ...prev,
                                      is_default: e.target.checked,
                                    }))
                                  }
                                  className="h-4 w-4 accent-[rgb(var(--ac))]"
                                />
                                {t("manage.option.defaultChoice")}
                              </label>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addValueToDefinition(def)}
                              >
                                {t("manage.option.addChoice")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={closeAddChoice}
                              >
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => openAddChoice(def.id)}
                          >
                            <PlusIcon className="h-4 w-4" />
                            {t("manage.option.addChoice")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-destructive shrink-0"
                    aria-label={t("manage.option.deleteNamed", {
                      name: def.name,
                    })}
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
            <AlertDialogTitle>
              {t("manage.option.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.option.deleteBody", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Removing a choice is as permanent as removing the option itself, so it
          asks the same way rather than going on the first click. */}
      <AlertDialog
        open={!!valueToDelete}
        onOpenChange={(open) => !open && setValueToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("manage.option.deleteChoiceTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.option.deleteChoiceBody", {
                label: valueToDelete?.value.label ?? "",
                name: valueToDelete?.definition.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingValueId === valueToDelete?.value.id}
              onClick={removeValue}
            >
              {removingValueId === valueToDelete?.value.id
                ? t("common.deleting")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
