import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Users, ShoppingCart, DollarSign, TrendingUp, MapPin, Tag, Star,
  ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PageHeader, StatCard, SectionCard } from "@/components/admin/shared/AdminUI";

const fmt = (n: number) => n.toLocaleString("da-DK");
const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

const usePlatformData = () =>
  useQuery({
    queryKey: ["platform-stats-raw"],
    queryFn: async () => {
      const [b, p, o, r, s] = await Promise.all([
        supabase.from("businesses").select("id, created_at, is_active, category, city, name"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("orders").select("id, created_at, total_amount, status, business_id, customer_email"),
        supabase.from("reviews").select("id, rating, created_at"),
        supabase.from("subscriptions").select("id, created_at, status, total_price, interval"),
      ]);
      if (b.error) throw b.error;
      if (p.error) throw p.error;
      if (o.error) throw o.error;
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      return { businesses: b.data || [], profiles: p.data || [], orders: o.data || [], reviews: r.data || [], subs: s.data || [] };
    },
  });

const trendPct = (curr: number, prev: number) => {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return ((curr - prev) / prev) * 100;
};

const TrendBadge = ({ pct }: { pct: number }) => {
  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const tone = pct > 0 ? "text-emerald-600 bg-emerald-500/10" : pct < 0 ? "text-red-600 bg-red-500/10" : "text-muted-foreground bg-secondary";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon className="h-2.5 w-2.5" strokeWidth={3} />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
};

/**
 * KPI-kort — bygger ovenpå StatCard fra AdminUI så vi har 100% samme ramme/typografi
 * som virksomhedspanelet, men tilføjer trend-badge + sparkline i bund.
 */
const KpiCard = ({
  label, value, icon: Icon, tone, sub, trend, spark,
}: { label: string; value: string; icon: any; tone: "emerald" | "blue" | "violet" | "amber"; sub?: string; trend?: number; spark?: { v: number }[] }) => (
  <div className="relative">
    <StatCard
      label={label}
      value={
        <span className="inline-flex items-baseline gap-2">
          {value}
          {trend !== undefined && <TrendBadge pct={trend} />}
        </span>
      }
      icon={<Icon />}
      tone={tone}
      hint={sub}
    />
    {spark && spark.length > 1 && (
      <div className="pointer-events-none absolute inset-x-3 bottom-2 h-6 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v" stroke={`hsl(var(--accent))`} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const PlatformOverviewTab = () => {
  const { data, isLoading } = usePlatformData();
  const { from, to, inRange, inPrevRange, rangeLabel } = useAdminFilters();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const ordersInRange = data.orders.filter((o) => inRange(o.created_at));
  const ordersPrev = data.orders.filter((o) => inPrevRange(o.created_at));
  const usersInRange = data.profiles.filter((p) => inRange(p.created_at));
  const usersPrev = data.profiles.filter((p) => inPrevRange(p.created_at));
  const bizInRange = data.businesses.filter((b) => inRange(b.created_at));
  const bizPrev = data.businesses.filter((b) => inPrevRange(b.created_at));

  const gmv = ordersInRange.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const gmvPrev = ordersPrev.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const completedGmv = ordersInRange.filter((o) => o.status === "completed").reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
  const avgOrder = ordersInRange.length ? gmv / ordersInRange.length : 0;
  const activeSubs = data.subs.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((s, x) => s + (Number(x.total_price) || 0), 0);

  // Repeat customers
  const customerOrders: Record<string, number> = {};
  ordersInRange.forEach((o) => {
    if (o.customer_email) customerOrders[o.customer_email] = (customerOrders[o.customer_email] || 0) + 1;
  });
  const uniqueCustomers = Object.keys(customerOrders).length;
  const repeatCustomers = Object.values(customerOrders).filter((c) => c > 1).length;
  const repeatRate = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;

  // Daily series for whole range
  const dayKeys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dayKeys.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  const days = dayKeys.map((k) => ({ date: k, orders: 0, users: 0, businesses: 0, gmv: 0 }));
  const idx: Record<string, number> = {};
  days.forEach((d, i) => (idx[d.date] = i));
  ordersInRange.forEach((o) => {
    const k = (o.created_at || "").slice(0, 10);
    if (k in idx) { days[idx[k]].orders += 1; days[idx[k]].gmv += Number(o.total_amount) || 0; }
  });
  usersInRange.forEach((p) => { const k = (p.created_at || "").slice(0, 10); if (k in idx) days[idx[k]].users += 1; });
  bizInRange.forEach((b) => { const k = (b.created_at || "").slice(0, 10); if (k in idx) days[idx[k]].businesses += 1; });

  const sparkOrders = days.map((d) => ({ v: d.orders }));
  const sparkUsers = days.map((d) => ({ v: d.users }));
  const sparkGmv = days.map((d) => ({ v: d.gmv }));
  const sparkBiz = days.map((d) => ({ v: d.businesses }));

  // Best weekday
  const dayOfWeek = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const orderByDow = [0, 0, 0, 0, 0, 0, 0];
  ordersInRange.forEach((o) => {
    const d = new Date(o.created_at).getDay();
    orderByDow[d] += 1;
  });
  const bestDow = orderByDow.indexOf(Math.max(...orderByDow));

  // Top categories/cities/businesses (whole platform — not range filtered, since they're identity)
  const catCounts: Record<string, number> = {};
  data.businesses.forEach((b) => { if (b.category) catCounts[b.category] = (catCounts[b.category] || 0) + 1; });
  const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const cityCounts: Record<string, number> = {};
  data.businesses.forEach((b) => { if (b.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1; });
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const revByBiz: Record<string, number> = {};
  ordersInRange.forEach((o) => { if (o.business_id) revByBiz[o.business_id] = (revByBiz[o.business_id] || 0) + (Number(o.total_amount) || 0); });
  const bizMap = new Map(data.businesses.map((b: any) => [b.id, b]));
  const topBusinesses = Object.entries(revByBiz).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, rev]) => ({ business: bizMap.get(id) as any, revenue: rev }));

  const handleExport = () => {
    exportCsv(`platform-oversigt-${rangeLabel.replace(/\s/g, "-")}`, days, ["date", "orders", "users", "businesses", "gmv"]);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform-overblik"
        description={<>Periode: <span className="font-medium text-foreground">{from.toLocaleDateString("da-DK")} – {to.toLocaleDateString("da-DK")}</span></>}
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Eksportér
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="GMV" value={fmtKr(gmv)} icon={DollarSign} tone="emerald"
          sub={`${fmtKr(completedGmv)} afsluttet`} trend={trendPct(gmv, gmvPrev)} spark={sparkGmv} />
        <KpiCard label="Ordrer" value={fmt(ordersInRange.length)} icon={ShoppingCart} tone="blue"
          sub={`Snit ${fmtKr(avgOrder)}`} trend={trendPct(ordersInRange.length, ordersPrev.length)} spark={sparkOrders} />
        <KpiCard label="Nye virksomheder" value={fmt(bizInRange.length)} icon={Building2} tone="violet"
          sub={`${data.businesses.length} i alt`} trend={trendPct(bizInRange.length, bizPrev.length)} spark={sparkBiz} />
        <KpiCard label="Nye brugere" value={fmt(usersInRange.length)} icon={Users} tone="amber"
          sub={`${data.profiles.length} i alt`} trend={trendPct(usersInRange.length, usersPrev.length)} spark={sparkUsers} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR (cyklisk)" value={fmtKr(mrr)} icon={<DollarSign />} tone="emerald" hint={`${activeSubs.length} aktive abonnementer`} />
        <StatCard label="Genkøbsrate" value={`${repeatRate.toFixed(0)}%`} icon={<Users />} tone="blue" hint={`${repeatCustomers} af ${uniqueCustomers} kunder`} />
        <StatCard label="Bedste ugedag" value={orderByDow[bestDow] > 0 ? dayOfWeek[bestDow] : "—"} icon={<TrendingUp />} tone="violet" hint={`${orderByDow[bestDow]} ordrer`} />
        <StatCard label="Anmeldelser" value={String(data.reviews.length)} icon={<Star />} tone="amber"
          hint={data.reviews.length ? `${(data.reviews.reduce((s, r) => s + (r.rating || 0), 0) / data.reviews.length).toFixed(1)} ★ snit` : "Ingen endnu"} />
      </div>

      <SectionCard
        title={<>Vækst — {rangeLabel.toLowerCase()}</>}
        icon={<TrendingUp />}
        description="Daglige nye ordrer, brugere og virksomheder"
      >
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="orders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--accent))" fill="url(#orders)" strokeWidth={2} name="Ordrer" />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--foreground))" fill="url(#users)" strokeWidth={2} name="Nye brugere" />
                <Area type="monotone" dataKey="businesses" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Nye virksomheder" />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Top kategorier" icon={<Tag />}>
          {topCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen data endnu</p>
            ) : (
              <ul className="space-y-2">
                {(() => {
                  const max = Math.max(...topCategories.map(([, n]) => n));
                  return topCategories.map(([cat, n]) => (
                    <li key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground truncate">{cat}</span>
                        <span className="tabular-nums font-medium text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            )}
        </SectionCard>

        <SectionCard title="Top byer" icon={<MapPin />}>
          {topCities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen data endnu</p>
            ) : (
              <ul className="space-y-2">
                {(() => {
                  const max = Math.max(...topCities.map(([, n]) => n));
                  return topCities.map(([city, n]) => (
                    <li key={city} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground truncate">{city}</span>
                        <span className="tabular-nums font-medium text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-foreground" style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            )}
        </SectionCard>

        <SectionCard title={<>Top virksomheder ({rangeLabel.toLowerCase()})</>} icon={<Star />}>
          {topBusinesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen omsætning i perioden</p>
            ) : (
              <ul className="space-y-1.5">
                {topBusinesses.map(({ business, revenue }) => (
                  <li key={business?.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{business?.name || "—"}</span>
                    <span className="tabular-nums font-medium text-muted-foreground">{fmtKr(revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
      </div>
    </div>
  );
};

export default PlatformOverviewTab;
