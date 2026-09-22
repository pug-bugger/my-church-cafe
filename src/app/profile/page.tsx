"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServerOrder, ServerUser } from "@/types";
import { OrdersDataTable } from "@/components/orders/OrdersDataTable";
import { PrinterStatusCard } from "@/components/profile/PrinterStatusCard";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { LanguageSettings } from "@/components/profile/LanguageSettings";
import { VersionFooter } from "@/components/profile/VersionFooter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api";
import {
  roleLabel,
  useTranslation,
  type MessageKey,
  type TranslateFn,
} from "@/i18n";
import { formatDate as formatLocaleDate, formatPrice, initialsFromName } from "@/lib/format";
import {
  getAuthToken,
  getStoredUser,
  setAuthSession,
  setStoredUser,
  clearAuthSession as clearStoredAuth,
} from "@/lib/auth";

type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  picture_url?: string | null;
};

type LoginResponse = {
  token?: string;
  accessToken?: string;
  data?: { token?: string; accessToken?: string };
  user?: SessionUser;
};

const getTokenFromResponse = (data: LoginResponse): string | undefined =>
  data.token ?? data.accessToken ?? data.data?.token ?? data.data?.accessToken;

function formatDate(dateStr: string, t: TranslateFn) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("time.today");
  if (d.toDateString() === yesterday.toDateString())
    return t("time.yesterdayCap");
  return formatLocaleDate(d, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type TopProductRow = { name: string; total: number };

// ── Date range helpers ───────────────────────────────────────────────────────

type DateRange = { from: Date | null; to: Date | null };
type Preset =
  | "all-time"
  | "last-sunday"
  | "last-2-weeks"
  | "last-month"
  | "last-3-months"
  | "custom";

function getLastSunday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 7 : day));
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

const PRESET_LABEL_KEYS: Record<Preset, MessageKey> = {
  "all-time": "profile.range.allTime",
  "last-sunday": "profile.range.lastSunday",
  "last-2-weeks": "profile.range.last2Weeks",
  "last-month": "profile.range.lastMonth",
  "last-3-months": "profile.range.last3Months",
  custom: "profile.range.custom",
};

const PRESETS: Preset[] = [
  "all-time",
  "last-sunday",
  "last-2-weeks",
  "last-month",
  "last-3-months",
  "custom",
];

function rangeFromPreset(p: Preset): DateRange {
  if (p === "all-time" || p === "custom") return { from: null, to: null };
  if (p === "last-sunday") {
    const from = getLastSunday();
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  const to = endOfToday();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (p === "last-2-weeks") from.setDate(from.getDate() - 14);
  if (p === "last-month") from.setMonth(from.getMonth() - 1);
  if (p === "last-3-months") from.setMonth(from.getMonth() - 3);
  return { from, to };
}

function DateRangeSelector({
  value,
  onChange,
  initialPreset = "all-time",
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  initialPreset?: Preset;
}) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>(initialPreset);

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") onChange(rangeFromPreset(p));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePreset(v as Preset)}>
        <SelectTrigger className="h-10 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(PRESET_LABEL_KEYS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input
            type="date"
            className="h-10 w-[140px] text-xs"
            value={toDateInput(value.from)}
            onChange={(e) => {
              const from = e.target.value
                ? new Date(e.target.value + "T00:00:00")
                : null;
              onChange({ ...value, from });
            }}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            className="h-10 w-[140px] text-xs"
            value={toDateInput(value.to)}
            onChange={(e) => {
              const to = e.target.value
                ? new Date(e.target.value + "T23:59:59")
                : null;
              onChange({ ...value, to });
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Charts ───────────────────────────────────────────────────────────────────
//
// All three encode one measure, so all three use the single accent hue: bar
// length carries the magnitude and every row is directly labelled. Colouring by
// rank instead would repaint the survivors whenever the date filter changes the
// set, which is exactly what the ranking is not allowed to do.

const CHART_MAX_ROWS = 15;

/** "Most ordered" — ranked magnitude, one row per product. */
function RankedBars({ data }: { data: TopProductRow[] }) {
  const rows = data.slice(0, CHART_MAX_ROWS);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-3.5">
          <span className="w-[110px] flex-none truncate text-sm sm:w-[150px]">
            {row.name}
          </span>
          <div className="flex flex-1 items-center gap-2.5">
            <div
              className="h-3.5 rounded-full bg-ac"
              style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }}
              title={`${row.name}: ×${row.total}`}
            />
            <span className="num text-xs text-muted-foreground">
              {row.total}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One option definition's value split, as share-of-total tracks. */
function ShareBars({ data }: { data: TopProductRow[] }) {
  const rows = data.slice(0, 8);
  const total = rows.reduce((sum, r) => sum + r.total, 0) || 1;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const pct = Math.round((row.total / total) * 100);
        return (
          <div key={row.name} className="flex items-center gap-2.5">
            <span className="w-[85px] flex-none truncate text-[13px] sm:w-[105px]">
              {row.name}
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-background">
              <div
                className="h-full rounded-full bg-ac"
                style={{ width: `${pct}%` }}
                title={`${row.name}: ×${row.total} (${pct}%)`}
              />
            </div>
            <span className="num w-9 flex-none text-right text-xs text-muted-foreground">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

type DayRow = { dateKey: string; count: number; label: string };

/** Orders per day — change over time, counts direct-labelled above each column. */
function DayColumns({ data }: { data: DayRow[] }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-[180px] items-end gap-2 overflow-x-auto">
      {data.map((day) => (
        <div
          key={day.dateKey}
          className="flex h-full min-w-[26px] max-w-[56px] flex-1 flex-col items-center justify-end gap-1.5"
          title={t("profile.overview.dayTooltip", {
            label: day.label,
            orders: t("common.orderCount", { count: day.count }),
          })}
        >
          <span className="num text-[11px] text-muted-foreground">
            {day.count}
          </span>
          <div
            className="w-full rounded-t-lg bg-ac"
            style={{ height: `${Math.max(2, (day.count / max) * 100)}%` }}
          />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────

function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-[22px]",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h3 className="text-base font-bold">{title}</h3> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function UserTable({
  users,
  loading,
}: {
  users: ServerUser[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading && users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("profile.users.loadingUsers")}
      </p>
    );
  }
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("profile.users.noUsers")}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-muted-foreground">
            <th className="p-4">{t("common.name")}</th>
            <th className="p-4">{t("common.email")}</th>
            <th className="p-4">{t("profile.account.role")}</th>
            <th className="hidden p-4 sm:table-cell">
              {t("profile.users.joined")}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="row-hover border-t border-line">
              <td className="p-4">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ac-soft text-xs font-bold text-ac-dark">
                    {initialsFromName(u.name)}
                  </span>
                  <span className="font-bold">{u.name}</span>
                </span>
              </td>
              <td className="p-4 text-muted-foreground">{u.email}</td>
              <td className="p-4">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-[5px] text-xs font-semibold",
                    u.role === "admin"
                      ? "bg-ac-soft text-ac-dark"
                      : "bg-neutral-soft text-muted-foreground"
                  )}
                >
                  {roleLabel(u.role, t) || "—"}
                </span>
              </td>
              <td className="num hidden p-4 text-muted-foreground sm:table-cell">
                {u.created_at ? formatLocaleDate(u.created_at, {}) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SectionId =
  | "account"
  | "preferences"
  | "overview"
  | "analytics"
  | "orders"
  | "users";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<ServerUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [section, setSection] = useState<SectionId>("account");
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [topProductsRange, setTopProductsRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [optionStatsRange, setOptionStatsRange] = useState<DateRange>(() =>
    rangeFromPreset("last-3-months")
  );

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const fetchToken = useCallback(() => {
    const token = getAuthToken();
    setHasToken(Boolean(token));
    setUser(getStoredUser<SessionUser>());
    return Boolean(token);
  }, []);

  const persistUser = useCallback((next: SessionUser) => {
    setUser(next);
    setStoredUser(next);
  }, []);

  const syncProfileFromApi = useCallback(async () => {
    if (!apiUrl || !hasToken || !getAuthToken()) return;
    try {
      const me = await apiFetch<{
        id: number;
        name: string;
        email: string;
        role: string | null;
        picture_url?: string | null;
      }>("/api/users/me", { auth: true });
      persistUser({
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role || "parishioner",
        picture_url: me.picture_url ?? null,
      });
    } catch {
      /* ignore */
    }
  }, [apiUrl, hasToken, persistUser]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (hasToken) syncProfileFromApi();
  }, [hasToken, syncProfileFromApi]);

  // Keep the editable account fields in step with whoever is signed in.
  useEffect(() => {
    setNameDraft(user?.name ?? "");
    setEmailDraft(user?.email ?? "");
  }, [user?.id, user?.name, user?.email]);

  const clearAuthSession = useCallback(() => {
    clearStoredAuth();
    setHasToken(false);
    setUser(null);
    setOrders([]);
    setDirectoryUsers([]);
    setSection("account");
  }, []);

  const showStaffOrderDashboard = useMemo(
    () => user?.role === "admin" || user?.role === "personal",
    [user?.role]
  );

  const isAdminDashboard = user?.role === "admin";

  const sections = useMemo<{ id: SectionId; label: string }[]>(() => {
    const list: { id: SectionId; label: string }[] = [
      { id: "account", label: t("profile.section.account") },
      { id: "preferences", label: t("profile.section.preferences") },
    ];
    if (showStaffOrderDashboard) {
      list.push(
        { id: "overview", label: t("profile.section.overview") },
        { id: "analytics", label: t("profile.section.analytics") },
        { id: "orders", label: t("profile.section.orders") }
      );
    }
    if (isAdminDashboard) {
      list.push({ id: "users", label: t("profile.section.users") });
    }
    return list;
  }, [showStaffOrderDashboard, isAdminDashboard, t]);

  // A role change can retire the open section (e.g. logging out of admin).
  useEffect(() => {
    if (!sections.some((s) => s.id === section)) setSection("account");
  }, [sections, section]);

  const readStoredRole = useCallback(
    (): string | null => getStoredUser<{ role?: string }>()?.role ?? null,
    []
  );

  const fetchDashboardOrders = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    const adminView = readStoredRole() === "admin";
    setOrdersLoading(true);
    try {
      const path = adminView ? "/api/orders" : "/api/orders/me";
      const data = await apiFetch<ServerOrder[]>(path, { auth: true });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthSession();
        return;
      }
      setOrders([]);
      toast.error(
        err instanceof Error ? err.message : t("errors.loadOrders")
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [apiUrl, hasToken, readStoredRole, clearAuthSession, t]);

  const fetchDirectoryUsers = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    setUsersLoading(true);
    try {
      const data = await apiFetch<ServerUser[]>("/api/users", { auth: true });
      setDirectoryUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthSession();
        return;
      }
      setDirectoryUsers([]);
      toast.error(
        err instanceof Error
          ? err.message
          : t("profile.users.loadDirectoryFailed")
      );
    } finally {
      setUsersLoading(false);
    }
  }, [apiUrl, hasToken, clearAuthSession, t]);

  useEffect(() => {
    if (!hasToken || !showStaffOrderDashboard || !user) {
      setOrders([]);
      setDirectoryUsers([]);
      return;
    }
    void fetchDashboardOrders();
    if (user.role === "admin") {
      void fetchDirectoryUsers();
    } else {
      setDirectoryUsers([]);
    }
  }, [
    hasToken,
    showStaffOrderDashboard,
    user?.id,
    user?.role,
    fetchDashboardOrders,
    fetchDirectoryUsers,
  ]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!apiUrl) {
      setError(t("auth.missingApiUrl"));
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
        credentials: "include",
        authError: t("auth.loginFailed"),
      });
      const token = getTokenFromResponse(data);
      const loggedIn = data.user;
      if (!token) throw new Error(t("auth.noTokenReturned"));
      if (loggedIn) {
        const nextUser: SessionUser = {
          ...loggedIn,
          picture_url: loggedIn.picture_url ?? null,
        };
        setAuthSession(token, nextUser);
        setUser(nextUser);
      } else {
        setAuthSession(token);
        setUser(null);
      }
      setHasToken(true);
      toast.success(t("auth.loggedIn"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.unableToLogin"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    toast.success(t("auth.loggedOut"));
  };

  async function handleSaveAccount() {
    if (!apiUrl || !user || !getAuthToken()) return;
    const name = nameDraft.trim();
    const nextEmail = emailDraft.trim();
    if (!name || !nextEmail) {
      toast.error(t("profile.account.nameEmailRequired"));
      return;
    }
    setSavingAccount(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        body: { name, email: nextEmail },
        auth: true,
        authError: t("profile.account.loginRequiredToUpdate"),
      });
      persistUser({ ...user, name, email: nextEmail });
      toast.success(t("profile.account.updated"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("profile.account.couldNotSave")
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleProfilePhoto(file: File) {
    if (!apiUrl || !user || !getAuthToken()) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiFetch<{ picture_url?: string }>(
        "/api/users/me/image",
        {
          method: "POST",
          formData: fd,
          auth: true,
          authError: t("profile.account.uploadFailed"),
        }
      );
      const url = data?.picture_url;
      if (typeof url === "string") {
        persistUser({ ...user, picture_url: url });
        toast.success(t("profile.account.photoUpdated"));
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("profile.account.uploadFailed")
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    if (!apiUrl || !user || !getAuthToken()) return;
    setPhotoUploading(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        body: { picture_url: null },
        auth: true,
        authError: t("profile.account.couldNotRemovePhoto"),
      });
      persistUser({ ...user, picture_url: null });
      toast.success(t("profile.account.photoRemoved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("profile.account.couldNotRemovePhoto")
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  const topProducts = useMemo(() => {
    const byName = new Map<string, number>();
    for (const order of orders) {
      const at = new Date(order.created_at);
      if (topProductsRange.from && at < topProductsRange.from) continue;
      if (topProductsRange.to && at > topProductsRange.to) continue;
      for (const item of order.items) {
        const name = item.product_item_name ?? t("common.unknown");
        byName.set(name, (byName.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(byName.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [orders, topProductsRange, t]);

  const optionStats = useMemo(() => {
    const byDefinition = new Map<string, Map<string, number>>();
    for (const order of orders) {
      const at = new Date(order.created_at);
      if (optionStatsRange.from && at < optionStatsRange.from) continue;
      if (optionStatsRange.to && at > optionStatsRange.to) continue;
      for (const item of order.items) {
        for (const opt of item.product_item_options ?? []) {
          // Definition and value names are admin-typed rows, so they stay as
          // typed; only the two words the app supplies itself are translated.
          const def =
            opt.option_definition_name ?? t("products.category.other");
          const raw = opt.option_value_name ?? t("common.unknown");
          const val =
            raw === "true"
              ? t("common.yes")
              : raw === "false"
                ? t("common.no")
                : raw;
          if (!byDefinition.has(def)) byDefinition.set(def, new Map());
          const inner = byDefinition.get(def)!;
          inner.set(val, (inner.get(val) ?? 0) + 1);
        }
      }
    }
    return Array.from(byDefinition.entries()).map(([definition, valMap]) => ({
      definition,
      data: Array.from(valMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
    }));
  }, [orders, optionStatsRange, t]);

  const ordersByDate = useMemo(() => {
    const byDate = new Map<string, { count: number; date: string }>();
    for (const order of orders) {
      const key = order.created_at.slice(0, 10);
      const existing = byDate.get(key);
      if (existing) existing.count += 1;
      else byDate.set(key, { count: 1, date: order.created_at });
    }
    return Array.from(byDate.entries())
      .map(([key, { count, date }]) => ({
        dateKey: key,
        date,
        count,
        label: formatDate(date, t),
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-14);
  }, [orders, t]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const ordersThisWeek = orders.filter(
      (o) => new Date(o.created_at) >= weekAgo
    ).length;
    const ordersThisMonth = orders.filter(
      (o) => new Date(o.created_at) >= monthAgo
    ).length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    return {
      totalOrders,
      totalItems,
      ordersThisWeek,
      ordersThisMonth,
      totalSpent: Number(totalSpent),
    };
  }, [orders]);

  const kpis = useMemo(() => {
    const list = [
      {
        label: isAdminDashboard
          ? t("profile.overview.ordersAllUsers")
          : t("profile.overview.totalOrders"),
        value: String(stats.totalOrders),
      },
      {
        label: isAdminDashboard
          ? t("profile.overview.itemsSoldAll")
          : t("profile.overview.totalItems"),
        value: String(stats.totalItems),
      },
      {
        label: t("profile.overview.thisWeek"),
        value: String(stats.ordersThisWeek),
      },
      {
        label: isAdminDashboard
          ? t("profile.overview.revenueAllOrders")
          : t("profile.overview.totalSpent"),
        value: formatPrice(stats.totalSpent),
      },
    ];
    if (isAdminDashboard) {
      list.push({
        label: t("profile.overview.registeredUsers"),
        value: usersLoading ? "…" : String(directoryUsers.length),
      });
    }
    return list;
  }, [stats, isAdminDashboard, usersLoading, directoryUsers.length, t]);

  const lineCountLabel = ordersLoading
    ? t("profile.orders.loadingOrders")
    : t("profile.orders.summary", {
        orders: t("common.orderCount", { count: stats.totalOrders }),
        items: t("common.itemCount", { count: stats.totalItems }),
      });

  // ── Signed out: the sign-in card, plus the theme picker ────────────────────
  // Appearance is a per-device setting, so a guest watching the order board can
  // still pick a palette without an account.
  if (!hasToken) {
    return (
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-[480px] rounded-card border border-line bg-surface p-6">
          <h1 className="mb-5 text-xl font-extrabold">{t("auth.signIn")}</h1>
          {!apiUrl && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{t("auth.configureApiHint")}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="profile-email">{t("common.email")}</Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-password">{t("common.password")}</Label>
              <Input
                id="profile-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="press min-h-12 rounded-ctl bg-primary text-[15px] font-bold text-primary-foreground hover:bg-ac-dark disabled:opacity-60"
            >
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>
        </div>

        {/* A guest watching the order board can still set their own device's
            appearance and language — both are per-device, not per-account. */}
        <ThemeSettings />
        <LanguageSettings />
        <VersionFooter />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[196px_1fr]">
        <nav
          aria-label={t("profile.sectionsLabel")}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:sticky lg:top-[88px] lg:flex-col lg:overflow-visible lg:px-0"
        >
          {sections.map((item) => {
            const on = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setSection(item.id)}
                className={cn(
                  "press flex min-h-[46px] flex-none items-center whitespace-nowrap rounded-[14px] px-4 text-[15px] font-semibold lg:w-full",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-ink/5"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {section === "account" && (
            <div className="flex max-w-[560px] flex-col gap-5">
              <div className="rounded-card border border-line bg-surface p-6">
                <h1 className="mb-5 text-xl font-extrabold">
                  {t("profile.section.account")}
                </h1>

                <div className="mb-[22px] flex items-center gap-5">
                  <Avatar className="h-[88px] w-[88px]">
                    {user?.picture_url && (
                      <AvatarImage
                        src={resolveMediaUrl(user?.picture_url ?? undefined)}
                        alt=""
                      />
                    )}
                    <AvatarFallback className="bg-ac-soft text-[28px] font-extrabold text-ac-dark">
                      {initialsFromName(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start gap-2">
                    <Label
                      htmlFor="profile-photo"
                      title={t("profile.account.photoTypes")}
                      className="press flex min-h-11 cursor-pointer items-center rounded-xl border border-line bg-surface px-[18px] text-sm font-semibold hover:bg-ink/5"
                    >
                      {photoUploading
                        ? t("profile.account.uploading")
                        : t("profile.account.uploadPhoto")}
                    </Label>
                    <input
                      id="profile-photo"
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleProfilePhoto(f);
                      }}
                    />
                    {user?.picture_url ? (
                      <button
                        type="button"
                        disabled={photoUploading}
                        onClick={() => void handleRemoveProfilePhoto()}
                        className="press min-h-10 px-1.5 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {t("profile.account.removePhoto")}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div>
                    <Label
                      htmlFor="account-name"
                      className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                    >
                      {t("common.name")}
                    </Label>
                    <Input
                      id="account-name"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="h-[46px] rounded-xl"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="account-email"
                      className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                    >
                      {t("common.email")}
                    </Label>
                    <Input
                      id="account-email"
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      className="h-[46px] rounded-xl"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="account-role"
                      className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                    >
                      {t("profile.account.role")}
                    </Label>
                    <Input
                      id="account-role"
                      value={roleLabel(user?.role, t) || "—"}
                      disabled
                      title={t("profile.account.roleLocked")}
                      className="h-[46px] rounded-xl"
                    />
                  </div>
                </div>

                <div className="mt-[22px] flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleSaveAccount()}
                    disabled={savingAccount}
                    className="press min-h-[46px] rounded-ctl bg-primary px-5 text-[15px] font-bold text-primary-foreground hover:bg-ac-dark disabled:opacity-60"
                  >
                    {savingAccount ? t("common.saving") : t("common.saveChanges")}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="press min-h-[46px] rounded-ctl border border-line bg-surface px-5 text-[15px] font-semibold hover:bg-ink/5"
                  >
                    {t("auth.logOut")}
                  </button>
                </div>
              </div>

              {showStaffOrderDashboard && <PrinterStatusCard />}
            </div>
          )}

          {section === "preferences" && (
            <div className="flex max-w-[680px] flex-col gap-5">
              <h1 className="text-xl font-extrabold">
                {t("profile.section.preferences")}
              </h1>
              <ThemeSettings />
              <LanguageSettings />
            </div>
          )}

          {section === "overview" && (
            <div>
              <h1 className="mb-4 text-xl font-extrabold">
                {t("profile.section.overview")}
              </h1>
              <div className="mb-[22px] grid grid-cols-2 gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-card border border-line bg-surface p-[18px]"
                  >
                    <div className="mb-2 text-[13px] text-muted-foreground">
                      {kpi.label}
                    </div>
                    <div className="num text-3xl font-extrabold leading-none tracking-[-0.02em]">
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>
              <Panel title={t("profile.overview.ordersPerDay")}>
                {ordersByDate.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("profile.overview.noOrders")}
                  </p>
                ) : (
                  <DayColumns data={ordersByDate} />
                )}
              </Panel>
            </div>
          )}

          {section === "analytics" && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-extrabold">
                {t("profile.section.analytics")}
              </h1>

              <Panel
                title={t("profile.analytics.mostOrdered")}
                action={
                  <DateRangeSelector
                    value={topProductsRange}
                    onChange={setTopProductsRange}
                    initialPreset="all-time"
                  />
                }
              >
                {topProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {isAdminDashboard
                      ? t("profile.analytics.noOrdersInRange")
                      : t("profile.analytics.noOrdersYetOwn")}
                  </p>
                ) : (
                  <RankedBars data={topProducts} />
                )}
              </Panel>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold">
                  {t("profile.analytics.optionChoices")}
                </h2>
                <DateRangeSelector
                  value={optionStatsRange}
                  onChange={setOptionStatsRange}
                  initialPreset="last-3-months"
                />
              </div>
              {optionStats.length === 0 ? (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("profile.analytics.noOptionData")}
                  </p>
                </Panel>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                  {optionStats.map(({ definition, data }) => (
                    <Panel key={definition} title={definition}>
                      <ShareBars data={data} />
                    </Panel>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "orders" && (
            <div>
              <div className="mb-4">
                <h1 className="mb-0.5 text-xl font-extrabold">
                  {t("profile.section.orders")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {lineCountLabel}
                </p>
              </div>
              <OrdersDataTable
                orders={orders}
                loading={ordersLoading}
                showUserColumns={isAdminDashboard}
                title={
                  isAdminDashboard
                    ? t("profile.orders.titleAll")
                    : t("profile.orders.titleMine")
                }
                description={
                  isAdminDashboard
                    ? t("profile.orders.descAll")
                    : t("profile.orders.descMine")
                }
              />
            </div>
          )}

          {section === "users" && (
            <div>
              <h1 className="mb-4 text-xl font-extrabold">
                {t("profile.section.users")}
              </h1>
              <UserTable users={directoryUsers} loading={usersLoading} />
            </div>
          )}
        </div>
      </div>

      <VersionFooter />
    </div>
  );
}
