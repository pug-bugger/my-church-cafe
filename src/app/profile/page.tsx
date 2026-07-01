"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ServerOrder, ServerUser } from "@/types";
import { OrdersDataTable } from "@/components/orders/OrdersDataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveMediaUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type TopProductRow = { name: string; total: number };

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

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
  const [preset, setPreset] = useState<Preset>(initialPreset);

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") onChange(rangeFromPreset(p));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePreset(v as Preset)}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-time">All time</SelectItem>
          <SelectItem value="last-sunday">Last Sunday</SelectItem>
          <SelectItem value="last-2-weeks">Last 2 weeks</SelectItem>
          <SelectItem value="last-month">Last month</SelectItem>
          <SelectItem value="last-3-months">Last 3 months</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input
            type="date"
            className="h-8 w-[130px] text-xs"
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
            className="h-8 w-[130px] text-xs"
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

function HorizontalBarChart({ data }: { data: TopProductRow[] }) {
  const slice = data.slice(0, 15);
  const chartHeight = Math.max(160, slice.length * 38 + 40);
  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={slice}
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            tickLine={false}
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`×${value ?? 0}`, "Ordered"]}
            contentStyle={{ borderRadius: "var(--radius)" }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {slice.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SmallPieChart({ data }: { data: TopProductRow[] }) {
  const slice = data.slice(0, 8);
  return (
    <div className="w-full space-y-3">
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value, name) => [`×${value ?? 0}`, name]}
              contentStyle={{ borderRadius: "var(--radius)" }}
            />
            <Pie
              data={slice}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={64}
              paddingAngle={2}
              stroke="var(--border)"
              strokeWidth={1}
            >
              {slice.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1">
        {slice.map((row, i) => (
          <li key={row.name} className="flex items-center gap-2 text-xs">
            <span
              className="shrink-0 h-2.5 w-2.5 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="flex-1 min-w-0 truncate">{row.name}</span>
            <span className="tabular-nums text-muted-foreground shrink-0">
              ×{row.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfilePage() {
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
  const [topProductsRange, setTopProductsRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [optionStatsRange, setOptionStatsRange] = useState<DateRange>(() =>
    rangeFromPreset("last-3-months")
  );

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const fetchToken = useCallback(() => {
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    setHasToken(Boolean(token));
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw) as SessionUser);
      } catch {
        setUser(null);
      }
    } else setUser(null);
    return Boolean(token);
  }, []);

  const persistUser = useCallback((next: SessionUser) => {
    setUser(next);
    localStorage.setItem("user", JSON.stringify(next));
    window.dispatchEvent(new Event("auth:token"));
  }, []);

  const syncProfileFromApi = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const me = (await response.json()) as {
        id: number;
        name: string;
        email: string;
        role: string | null;
        picture_url?: string | null;
      };
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

  const clearAuthSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:token"));
    setHasToken(false);
    setUser(null);
    setOrders([]);
    setDirectoryUsers([]);
  }, []);

  const showStaffOrderDashboard = useMemo(
    () => user?.role === "admin" || user?.role === "personal",
    [user?.role]
  );

  const isAdminDashboard = user?.role === "admin";

  const readStoredRole = useCallback((): string | null => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const r = JSON.parse(raw) as { role?: string };
      return r.role ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchDashboardOrders = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    const adminView = readStoredRole() === "admin";
    setOrdersLoading(true);
    try {
      const token =
        localStorage.getItem("token") ??
        localStorage.getItem("jwt") ??
        localStorage.getItem("accessToken");
      const path = adminView ? "/api/orders" : "/api/orders/me";
      const response = await fetch(`${apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        clearAuthSession();
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to load orders"
        );
      }
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
      toast.error(
        err instanceof Error ? err.message : "Unable to load orders"
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [apiUrl, hasToken, readStoredRole, clearAuthSession]);

  const fetchDirectoryUsers = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    setUsersLoading(true);
    try {
      const token =
        localStorage.getItem("token") ??
        localStorage.getItem("jwt") ??
        localStorage.getItem("accessToken");
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        clearAuthSession();
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to load users"
        );
      }
      const data = await response.json();
      setDirectoryUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setDirectoryUsers([]);
      toast.error(
        err instanceof Error ? err.message : "Unable to load user directory"
      );
    } finally {
      setUsersLoading(false);
    }
  }, [apiUrl, hasToken, clearAuthSession]);

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
      setError("Missing NEXT_PUBLIC_API_URL in your environment.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as LoginResponse;
      if (!response.ok) {
        throw new Error(
          (data as { error?: string })?.error ?? "Login failed"
        );
      }
      const token = getTokenFromResponse(data);
      const loggedIn = data.user;
      if (!token) throw new Error("Login succeeded but no token was returned.");
      localStorage.setItem("token", token);
      if (loggedIn) {
        persistUser({
          ...loggedIn,
          picture_url: loggedIn.picture_url ?? null,
        });
      } else {
        setUser(null);
        window.dispatchEvent(new Event("auth:token"));
      }
      setHasToken(true);
      toast.success("Logged in");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to login. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    toast.success("Logged out");
  };

  function profileInitials(name: string) {
    return (
      name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?"
    );
  }

  async function handleProfilePhoto(file: File) {
    if (!apiUrl || !user) return;
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const response = await fetch(`${apiUrl}/api/users/me/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await response.json()) as {
        picture_url?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      const url = data.picture_url;
      if (typeof url === "string") {
        persistUser({ ...user, picture_url: url });
        toast.success("Profile photo updated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    if (!apiUrl || !user) return;
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) return;
    setPhotoUploading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ picture_url: null }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove photo");
      }
      persistUser({ ...user, picture_url: null });
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove photo"
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  const topProducts = useMemo(() => {
    const byName = new Map<string, number>();
    for (const order of orders) {
      const t = new Date(order.created_at);
      if (topProductsRange.from && t < topProductsRange.from) continue;
      if (topProductsRange.to && t > topProductsRange.to) continue;
      for (const item of order.items) {
        const name = item.product_item_name ?? "Unknown";
        byName.set(name, (byName.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(byName.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [orders, topProductsRange]);

  const optionStats = useMemo(() => {
    const byDefinition = new Map<string, Map<string, number>>();
    for (const order of orders) {
      const t = new Date(order.created_at);
      if (optionStatsRange.from && t < optionStatsRange.from) continue;
      if (optionStatsRange.to && t > optionStatsRange.to) continue;
      for (const item of order.items) {
        for (const opt of item.product_item_options ?? []) {
          const def = opt.option_definition_name ?? "Other";
          const val = opt.option_value_name ?? "Unknown";
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
  }, [orders, optionStatsRange]);

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
        label: formatDate(date),
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-14);
  }, [orders]);

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
    const totalSpent = orders.reduce(
      (sum, o) => sum + Number(o.total ?? 0),
      0
    );
    return {
      totalOrders,
      totalItems,
      ordersThisWeek,
      ordersThisMonth,
      totalSpent: Number(totalSpent),
    };
  }, [orders]);

  return (
    <div
      className={cn(
        "container mx-auto py-10 max-w-2xl space-y-8 md:max-w-4xl",
        isAdminDashboard && "xl:max-w-6xl"
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            Profile{" "}
            <span className="text-muted-foreground text-sm">
              {user?.role ? `(${user.role})` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiUrl && (
            <Alert variant="destructive">
              <AlertDescription>
                Set `NEXT_PUBLIC_API_URL` in `.env.local` to connect.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!hasToken ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
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
                <Label htmlFor="profile-password">Password</Label>
                <Input
                  id="profile-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex flex-col items-center sm:items-start gap-3">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    {user?.picture_url && (
                      <>
                        <AvatarImage
                          src={resolveMediaUrl(user?.picture_url ?? undefined)}
                          alt=""
                        />
                      </>
                    )}
                    <AvatarFallback className="text-lg">
                      {user?.name ? profileInitials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Label htmlFor="profile-photo" className="sr-only">
                      Profile photo
                    </Label>
                    <Input
                      id="profile-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleProfilePhoto(f);
                      }}
                    />
                    {user?.picture_url ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={photoUploading}
                        onClick={() => void handleRemoveProfilePhoto()}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Name:</span> {user?.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Email:</span> {user?.email}
                  </p>
                  <Button variant="secondary" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasToken && showStaffOrderDashboard && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">
              {isAdminDashboard ? "Admin dashboard" : "Your dashboard"}
            </h2>
            {isAdminDashboard && (
              <p className="text-sm text-muted-foreground mt-1">
                All orders, revenue, and user accounts across the cafe.
              </p>
            )}
          </div>

          {ordersLoading && !orders.length ? (
            <p className="text-muted-foreground text-sm">Loading orders…</p>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-4",
                  isAdminDashboard
                    ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
                    : "grid-cols-2 md:grid-cols-4"
                )}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {isAdminDashboard ? "Orders (all users)" : "Total orders"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {stats.totalOrders}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {isAdminDashboard ? "Items sold (all)" : "Total items"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {stats.totalItems}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {stats.ordersThisWeek}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {isAdminDashboard ? "Revenue (all orders)" : "Total spent"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      ${Number(stats.totalSpent).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                {isAdminDashboard && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Registered users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">
                        {usersLoading ? "…" : directoryUsers.length}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {isAdminDashboard && (
                <Card>
                  <CardHeader>
                    <CardTitle>User directory</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Everyone with an account (name, email, role).
                    </p>
                  </CardHeader>
                  <CardContent>
                    {usersLoading && directoryUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Loading users…
                      </p>
                    ) : directoryUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No users found.
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50 text-left">
                              <th className="p-3 font-medium">Name</th>
                              <th className="p-3 font-medium">Email</th>
                              <th className="p-3 font-medium">Role</th>
                              <th className="p-3 font-medium hidden sm:table-cell">
                                Joined
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {directoryUsers.map((u) => (
                              <tr key={u.id} className="border-b last:border-0">
                                <td className="p-3 font-medium">{u.name}</td>
                                <td className="p-3 text-muted-foreground">
                                  {u.email}
                                </td>
                                <td className="p-3 capitalize">
                                  {u.role ?? "—"}
                                </td>
                                <td className="p-3 text-muted-foreground hidden sm:table-cell">
                                  {u.created_at
                                    ? new Date(u.created_at).toLocaleDateString()
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Analytics — tabbed charts */}
              <Card>
                <Tabs defaultValue="top-products">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle>Analytics</CardTitle>
                      <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="top-products" className="flex-1 sm:flex-none">
                          Top products
                        </TabsTrigger>
                        <TabsTrigger value="option-stats" className="flex-1 sm:flex-none">
                          Options
                        </TabsTrigger>
                        <TabsTrigger value="by-date" className="flex-1 sm:flex-none">
                          By date
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="top-products" className="mt-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="font-medium text-sm">Most ordered products</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isAdminDashboard
                              ? "Top items by quantity across all orders"
                              : "Your top items by quantity ordered"}
                          </p>
                        </div>
                        <DateRangeSelector
                          value={topProductsRange}
                          onChange={setTopProductsRange}
                          initialPreset="all-time"
                        />
                      </div>
                      {topProducts.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">
                          {isAdminDashboard
                            ? "No orders in this range."
                            : "No orders yet. Order from the Terminal to see your top products here."}
                        </p>
                      ) : (
                        <HorizontalBarChart data={topProducts} />
                      )}
                    </TabsContent>

                    <TabsContent value="option-stats" className="mt-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                          <p className="font-medium text-sm">Option statistics</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isAdminDashboard
                              ? "Breakdown of drink options chosen across all orders"
                              : "Breakdown of drink options you have chosen"}
                          </p>
                        </div>
                        <DateRangeSelector
                          value={optionStatsRange}
                          onChange={setOptionStatsRange}
                          initialPreset="last-3-months"
                        />
                      </div>
                      {optionStats.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">
                          No option data in this range.
                        </p>
                      ) : (
                        <div className="grid gap-6 sm:grid-cols-2">
                          {optionStats.map(({ definition, data }) => (
                            <div key={definition} className="space-y-1">
                              <p className="text-sm font-medium text-center capitalize">
                                {definition}
                              </p>
                              <SmallPieChart data={data} />
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="by-date" className="mt-0">
                      <div className="mb-4">
                        <p className="font-medium text-sm">Orders by date</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isAdminDashboard
                            ? "Last 14 days — count of all orders per day"
                            : "Last 14 days"}
                        </p>
                      </div>
                      {ordersByDate.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">
                          No orders yet.
                        </p>
                      ) : (
                        <div className="h-[240px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={ordersByDate}
                              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                            >
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                              />
                              <YAxis
                                dataKey="count"
                                allowDecimals={false}
                                tickLine={false}
                                width={24}
                              />
                              <Tooltip
                                formatter={(value) => [value ?? 0, "Orders"]}
                                contentStyle={{ borderRadius: "var(--radius)" }}
                              />
                              <Bar
                                dataKey="count"
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>

              <OrdersDataTable
                orders={orders}
                loading={ordersLoading}
                showUserColumns={isAdminDashboard}
                title={
                  isAdminDashboard
                    ? "All orders — line items"
                    : "Your orders data"
                }
                description={
                  isAdminDashboard
                    ? "Every customer's line items. Default range is the last 30 days; filter, sort, group, and export."
                    : "Line items from your orders. Default range is the last 30 days; change dates, sort, group, and export."
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
