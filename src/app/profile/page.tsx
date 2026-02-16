"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ServerOrder } from "@/types";

type LoginResponse = {
  token?: string;
  accessToken?: string;
  data?: { token?: string; accessToken?: string };
  user?: { id: number; name: string; email: string; role: string };
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

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const fetchToken = useCallback(() => {
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    setHasToken(Boolean(token));
    const user = localStorage.getItem("user");
    if (user) setUser(JSON.parse(user));
    return Boolean(token);
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const fetchMyOrders = useCallback(async () => {
    if (!apiUrl || !hasToken) return;
    setOrdersLoading(true);
    try {
      const token =
        localStorage.getItem("token") ??
        localStorage.getItem("jwt") ??
        localStorage.getItem("accessToken");
      const response = await fetch(`${apiUrl}/api/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load orders");
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [apiUrl, hasToken]);

  useEffect(() => {
    if (hasToken) fetchMyOrders();
    else setOrders([]);
  }, [hasToken, fetchMyOrders]);

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
      const user = data.user;
      if (!token) throw new Error("Login succeeded but no token was returned.");
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("auth:token"));
      setHasToken(true);
      toast.success("Logged in");
      fetchMyOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to login. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:token"));
    setHasToken(false);
    setOrders([]);
    toast.success("Logged out");
  };

  const topProducts = useMemo(() => {
    const byName = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.product_item_name ?? "Unknown";
        byName.set(name, (byName.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(byName.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  const ordersByDate = useMemo(() => {
    const byDate = new Map<string, { count: number; date: string }>();
    for (const order of orders) {
      const key = order.created_at.slice(0, 10);
      const existing = byDate.get(key);
      if (existing) existing.count += 1;
      else byDate.set(key, { count: 1, date: order.created_at });
    }
    return Array.from(byDate.entries())
      .map(([key, { count, date }]) => ({ dateKey: key, date, count, label: formatDate(date) }))
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

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="container mx-auto py-10 max-w-2xl space-y-8 md:max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile <span className="text-muted-foreground text-sm">({user?.role})</span></CardTitle>
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
            <div className="space-y-4">
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
          )}
        </CardContent>
      </Card>

      {hasToken && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Your dashboard</h2>

          {ordersLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalItems}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{stats.ordersThisWeek}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total spent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      ${Number(stats.totalSpent).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Most ordered products</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your top items by quantity ordered
                  </p>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-8 text-center">
                      No orders yet. Order from the Terminal to see your top products here.
                    </p>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topProducts.slice(0, 8)}
                          layout="vertical"
                          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value) => [`×${value ?? 0}`, "Quantity"]}
                            contentStyle={{ borderRadius: "var(--radius)" }}
                          />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={24}>
                            {topProducts.slice(0, 8).map((_, i) => (
                              <Cell
                                key={i}
                                fill={chartColors[i % chartColors.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders by date</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last 14 days
                  </p>
                </CardHeader>
                <CardContent>
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
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
