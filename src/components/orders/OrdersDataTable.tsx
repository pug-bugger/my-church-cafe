"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice } from "@/lib/format";
import { statusLabel, useTranslation } from "@/i18n";
import type { ServerOrder } from "@/types";

export type FlatOrderRow = {
  orderId: number;
  orderNumber?: number;
  orderDate: Date;
  orderDateKey: string;
  status: string;
  userName?: string | null;
  userEmail?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type SortKey = "date" | "product" | "price" | "orderId";
type GroupBy = "none" | "product" | "date" | "price";

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseInputDateLocal(isoDay: string, endOfDay: boolean): Date {
  const [y, mo, d] = isoDay.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(y, mo - 1, d);
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  else dt.setHours(0, 0, 0, 0);
  return dt;
}

function defaultRange(): { fromStr: string; toStr: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { fromStr: toInputDate(from), toStr: toInputDate(to) };
}

function compareRows(
  a: FlatOrderRow,
  b: FlatOrderRow,
  key: SortKey,
  dir: 1 | -1,
): number {
  let cmp = 0;
  switch (key) {
    case "date":
      cmp = a.orderDate.getTime() - b.orderDate.getTime();
      break;
    case "product":
      cmp = a.productName.localeCompare(b.productName, undefined, {
        sensitivity: "base",
      });
      break;
    case "price":
      cmp = a.unitPrice - b.unitPrice;
      break;
    case "orderId":
      cmp = a.orderId - b.orderId;
      break;
    default:
      cmp = 0;
  }
  if (cmp === 0) cmp = a.orderId - b.orderId;
  return cmp * dir;
}

function groupKeyFor(row: FlatOrderRow, groupBy: GroupBy): string {
  switch (groupBy) {
    case "product":
      return row.productName || "—";
    case "date":
      return row.orderDateKey;
    case "price":
      return row.unitPrice.toFixed(2);
    default:
      return "";
  }
}

type DisplayPiece =
  | { kind: "header"; label: string; subtotal?: number }
  | { kind: "row"; row: FlatOrderRow };

function buildDisplayPieces(
  flat: FlatOrderRow[],
  sortKey: SortKey,
  sortDir: 1 | -1,
  groupBy: GroupBy,
): DisplayPiece[] {
  if (groupBy === "none") {
    const sorted = [...flat].sort((a, b) =>
      compareRows(a, b, sortKey, sortDir),
    );
    return sorted.map((row) => ({ kind: "row" as const, row }));
  }

  const map = new Map<string, FlatOrderRow[]>();
  for (const row of flat) {
    const g = groupKeyFor(row, groupBy);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(row);
  }

  const entries = [...map.entries()].map(([key, rows]) => {
    const sortedInner = [...rows].sort((a, b) =>
      compareRows(a, b, sortKey, sortDir),
    );
    const subtotal = sortedInner.reduce((s, r) => s + r.lineTotal, 0);
    return { key, rows: sortedInner, subtotal };
  });

  entries.sort((a, b) => {
    if (groupBy === "price") {
      return (Number.parseFloat(a.key) || 0) - (Number.parseFloat(b.key) || 0);
    }
    if (groupBy === "date") {
      return a.key.localeCompare(b.key);
    }
    return a.key.localeCompare(b.key, undefined, { sensitivity: "base" });
  });

  const out: DisplayPiece[] = [];
  for (const { key, rows, subtotal } of entries) {
    let label = key;
    if (groupBy === "price") label = `€${key}`;
    if (groupBy === "date") {
      try {
        const [y, mo, d] = key.split("-").map((n) => Number.parseInt(n, 10));
        const dt = new Date(y, mo - 1, d);
        label = dt.toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        /* keep key */
      }
    }
    out.push({ kind: "header", label, subtotal });
    for (const row of rows) out.push({ kind: "row", row });
  }
  return out;
}

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV column names stay English snake_case on purpose: this is a machine
 * format, and a spreadsheet or script that reads the export must not break
 * because the person who downloaded it had the app in Lithuanian. The .xlsx
 * export, which is read by people, uses translated headers.
 */
function rowsToCsv(rows: FlatOrderRow[], includeUser: boolean): string {
  const headers = includeUser
    ? [
        "order_id",
        "order_number",
        "date",
        "status",
        "customer",
        "email",
        "product",
        "quantity",
        "unit_price",
        "line_total",
      ]
    : [
        "order_id",
        "order_number",
        "date",
        "status",
        "product",
        "quantity",
        "unit_price",
        "line_total",
      ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const dateIso = r.orderDate.toISOString();
    const cells: (string | number)[] = includeUser
      ? [
          r.orderId,
          r.orderNumber ?? "",
          dateIso,
          r.status,
          r.userName ?? "",
          r.userEmail ?? "",
          r.productName,
          r.quantity,
          r.unitPrice.toFixed(2),
          r.lineTotal.toFixed(2),
        ]
      : [
          r.orderId,
          r.orderNumber ?? "",
          dateIso,
          r.status,
          r.productName,
          r.quantity,
          r.unitPrice.toFixed(2),
          r.lineTotal.toFixed(2),
        ];
    lines.push(cells.map((c) => escapeCsvCell(c)).join(","));
  }
  return lines.join("\r\n");
}

type OrdersDataTableProps = {
  orders: ServerOrder[];
  loading?: boolean;
  /** Show customer name / email columns (all-orders / admin view). */
  showUserColumns?: boolean;
  /** Defaults to `manage.table.defaultTitle` / `…defaultDescription`. */
  title?: string;
  description?: string;
};

export function OrdersDataTable({
  orders,
  loading,
  showUserColumns = false,
  title,
  description,
}: OrdersDataTableProps) {
  const { t } = useTranslation();
  const initial = useMemo(() => defaultRange(), []);
  const [exportOpen, setExportOpen] = useState(false);
  const [fromStr, setFromStr] = useState(initial.fromStr);
  const [toStr, setToStr] = useState(initial.toStr);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const fromTime = useMemo(
    () => parseInputDateLocal(fromStr, false).getTime(),
    [fromStr],
  );
  const toTime = useMemo(
    () => parseInputDateLocal(toStr, true).getTime(),
    [toStr],
  );

  const flatRows = useMemo(() => {
    const rows: FlatOrderRow[] = [];
    for (const order of orders) {
      const at = new Date(order.created_at).getTime();
      if (at < fromTime || at > toTime) continue;
      const orderDate = new Date(order.created_at);
      const orderDateKey = toInputDate(orderDate);
      for (const item of order.items) {
        const unit = Number(item.price ?? 0);
        const qty = item.quantity;
        rows.push({
          orderId: order.id,
          orderNumber: order.order_number,
          orderDate,
          orderDateKey,
          status: order.status,
          userName: order.user_name,
          userEmail: order.user_email,
          productName: item.product_item_name ?? t("common.unknown"),
          quantity: qty,
          unitPrice: unit,
          lineTotal: unit * qty,
        });
      }
    }
    return rows;
  }, [orders, fromTime, toTime, t]);

  const displayPieces = useMemo(
    () => buildDisplayPieces(flatRows, sortKey, sortDir, groupBy),
    [flatRows, sortKey, sortDir, groupBy],
  );

  const exportRowsOrdered = useMemo(() => {
    const out: FlatOrderRow[] = [];
    for (const p of displayPieces) {
      if (p.kind === "row") out.push(p.row);
    }
    return out;
  }, [displayPieces]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
      else {
        setSortKey(key);
        setSortDir(key === "date" || key === "orderId" ? -1 : 1);
      }
    },
    [sortKey],
  );

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
    return sortDir === 1 ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  const headerBtn = (label: string, column: SortKey) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className={cn(
        "inline-flex items-center font-medium hover:text-foreground",
        sortKey === column ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <SortIcon column={column} />
    </button>
  );

  const downloadCsv = useCallback(() => {
    const csv = rowsToCsv(exportRowsOrdered, showUserColumns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${fromStr}_to_${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportRowsOrdered, showUserColumns, fromStr, toStr]);

  const downloadExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    // Read by people, so translated — unlike the CSV's machine column names.
    const headers = showUserColumns
      ? [
          t("manage.table.columnOrderId"),
          t("manage.table.columnOrderNumber"),
          t("manage.table.columnDate"),
          t("common.status"),
          t("manage.table.columnCustomer"),
          t("common.email"),
          t("manage.table.columnProduct"),
          t("manage.table.columnQty"),
          t("manage.table.columnUnitPrice"),
          t("manage.table.columnLineTotal"),
        ]
      : [
          t("manage.table.columnOrderId"),
          t("manage.table.columnOrderNumber"),
          t("manage.table.columnDate"),
          t("common.status"),
          t("manage.table.columnProduct"),
          t("manage.table.columnQty"),
          t("manage.table.columnUnitPrice"),
          t("manage.table.columnLineTotal"),
        ];
    const data = exportRowsOrdered.map((r) => {
      const base = [
        r.orderId,
        r.orderNumber ?? "",
        r.orderDate.toISOString(),
        r.status,
        r.productName,
        r.quantity,
        r.unitPrice,
        r.lineTotal,
      ];
      if (showUserColumns) {
        return [
          r.orderId,
          r.orderNumber ?? "",
          r.orderDate.toISOString(),
          r.status,
          r.userName ?? "",
          r.userEmail ?? "",
          r.productName,
          r.quantity,
          r.unitPrice,
          r.lineTotal,
        ];
      }
      return base;
    });
    const aoa = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    // Sheet names are ASCII-only in practice across spreadsheet apps, so the
    // catalogue carries a transliterated name rather than a localised one.
    XLSX.utils.book_append_sheet(wb, ws, t("manage.table.sheetName"));
    XLSX.writeFile(wb, `orders-${fromStr}_to_${toStr}.xlsx`);
  }, [exportRowsOrdered, showUserColumns, fromStr, toStr, t]);

  const colCount = showUserColumns ? 9 : 7;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>{title ?? t("manage.table.defaultTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {description ?? t("manage.table.defaultDescription")}
        </p>
        {/* One row of equal-height controls; each field keeps its label directly
            above it and every control lines up on the same baseline. */}
        <div className="flex flex-wrap items-end gap-3 pt-4">
          <div className="flex w-full flex-col gap-1.5 sm:w-[170px]">
            <Label
              htmlFor="orders-from"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("manage.table.from")}
            </Label>
            <Input
              id="orders-from"
              type="date"
              className="h-11"
              value={fromStr}
              onChange={(e) => setFromStr(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-[170px]">
            <Label
              htmlFor="orders-to"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("manage.table.to")}
            </Label>
            <Input
              id="orders-to"
              type="date"
              className="h-11"
              value={toStr}
              onChange={(e) => setToStr(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-[180px]">
            <Label
              htmlFor="orders-group-by"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("manage.table.groupBy")}
            </Label>
            <Select
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as GroupBy)}
            >
              <SelectTrigger id="orders-group-by" className="h-11 rounded-ctl">
                <SelectValue placeholder={t("manage.table.groupBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("manage.table.groupNone")}
                </SelectItem>
                <SelectItem value="product">
                  {t("manage.table.groupProduct")}
                </SelectItem>
                <SelectItem value="date">
                  {t("manage.table.groupDate")}
                </SelectItem>
                <SelectItem value="price">
                  {t("manage.table.groupPrice")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Auto left margin pushes Export to the far edge of the flex row. */}
          <div className="w-full sm:ml-auto sm:w-auto">
            <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-ctl sm:w-auto"
                >
                  {t("manage.table.export")}
                  <ChevronDown
                    className={cn(
                      "transition-transform duration-200 motion-reduce:transition-none",
                      exportOpen && "rotate-180",
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => downloadCsv()}>
                  {t("manage.table.exportCsv")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void downloadExcel()}>
                  {t("manage.table.exportExcel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          {t("manage.table.showing", {
            lines: t("manage.table.lineItemCount", { count: flatRows.length }),
            orders: t("common.orderCount", { count: orders.length }),
          })}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            {t("profile.orders.loadingOrders")}
          </p>
        ) : flatRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("manage.table.noRows")}
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm caption-bottom">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  {showUserColumns && (
                    <>
                      <th className="p-3 font-medium whitespace-nowrap">
                        {t("manage.table.columnCustomer")}
                      </th>
                      <th className="p-3 font-medium whitespace-nowrap">
                        {t("common.email")}
                      </th>
                    </>
                  )}
                  <th className="p-3 font-medium whitespace-nowrap">
                    {headerBtn(t("manage.table.columnOrder"), "orderId")}
                  </th>
                  <th className="p-3 font-medium whitespace-nowrap">
                    {headerBtn(t("manage.table.columnDate"), "date")}
                  </th>
                  <th className="p-3 font-medium whitespace-nowrap">
                    {t("common.status")}
                  </th>
                  <th className="p-3 font-medium whitespace-nowrap">
                    {headerBtn(t("manage.table.columnProduct"), "product")}
                  </th>
                  <th className="p-3 font-medium text-right whitespace-nowrap">
                    {t("manage.table.columnQty")}
                  </th>
                  <th className="p-3 font-medium text-right whitespace-nowrap">
                    {headerBtn(t("manage.table.columnUnitPrice"), "price")}
                  </th>
                  <th className="p-3 font-medium text-right whitespace-nowrap">
                    {t("manage.table.columnLineTotal")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayPieces.map((piece, i) => {
                  if (piece.kind === "header") {
                    return (
                      <tr key={`h-${i}`} className="bg-muted/30">
                        <td
                          colSpan={colCount}
                          className="p-2 px-3 font-semibold text-foreground border-t"
                        >
                          <span>{piece.label}</span>
                          {piece.subtotal != null && (
                            <span className="ml-2 text-muted-foreground font-normal tabular-nums">
                              {t("manage.table.subtotal", {
                                amount: formatPrice(piece.subtotal),
                              })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  const r = piece.row;
                  return (
                    <tr
                      key={`${r.orderId}-${r.productName}-${i}`}
                      className="border-t border-border/60"
                    >
                      {showUserColumns && (
                        <>
                          <td
                            className="p-3 whitespace-nowrap max-w-[140px] truncate"
                            title={r.userName ?? undefined}
                          >
                            {r.userName ?? "—"}
                          </td>
                          <td className="p-3 whitespace-nowrap max-w-[180px] truncate text-muted-foreground">
                            {r.userEmail ?? "—"}
                          </td>
                        </>
                      )}
                      <td className="p-3 tabular-nums whitespace-nowrap">
                        #{r.orderNumber ?? r.orderId}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(r.orderDate, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {statusLabel(r.status, t)}
                      </td>
                      <td className="p-3 max-w-[200px]">{r.productName}</td>
                      <td className="p-3 text-right tabular-nums">
                        {r.quantity}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatPrice(r.unitPrice)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        {formatPrice(r.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
