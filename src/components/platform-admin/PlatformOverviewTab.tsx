import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Users, ShoppingCart, DollarSign, TrendingUp, MapPin, Tag, Star,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const fmt = (n: number) => n.toLocaleString("da-DK");
const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

const usePlatformStats = () =>
  useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [b, p, o, r] = await Promise.all([
        supabase.from("businesses").select("id, created_at, is_active, category, city"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("orders").select("id, created_at, total_amount, status, business_id"),
        supabase.from("reviews").select("id, rating, created_at"),
      ]);

      if (b.error) throw b.error;
      if (p.error) throw p.error;
      if (o.error) throw o.error;
      if (r.error) throw r.error;

      const businesses = b.data || [];
      const profiles = p.data || [];
      const orders = o.data || [];
      const reviews = r.data || [];

      const gmv = orders.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
      const completedGmv = orders
        .filter((o) => o.status === "completed")
        .reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
      const avgOrder = orders.length ? gmv / orders.length : 0;

      // Time-series last 30 days
      const days: { date: string; orders: number; users: number; businesses: number; gmv: number }[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, orders: 0, users: 0, businesses: 0, gmv: 0 });
      }
      const idx: Record<string, number> = {};
      days.forEach((d, i) => (idx[d.date] = i));
      orders.forEach((o) => {
        const k = (o.created_at || "").slice(0, 10);
        if (k in idx) {
          days[idx[k]].orders += 1;
          days[idx[k]].gmv += Number(o.total_amount) || 0;
        }
      });
      profiles.forEach((p) => {
        const k = (p.created_at || "").slice(0, 10);
        if (k in idx) days[idx[k]].users += 1;
      });
      businesses.forEach((b) => {
        const k = (b.created_at || "").slice(0, 10);
        if (k in idx) days[idx[k]].businesses += 1;
      });

      // Top categories
      const catCounts: Record<string, number> = {};
      businesses.forEach((b) => {
        if (b.category) catCounts[b.category] = (catCounts[b.category] || 0) + 1;
      });
      const topCategories = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      // Top cities
      const cityCounts: Record<string, number> = {};
      businesses.forEach((b) => {
        if (b.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1;
      });
      const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      // Top businesses by revenue
      const revByBiz: Record<string, number> = {};
      orders.forEach((o) => {
        if (o.business_id) revByBiz[o.business_id] = (revByBiz[o.business_id] || 0) + (Number(o.total_amount) || 0);
      });
      const bizMap = new Map(businesses.map((b: any) => [b.id, b]));
      const topBusinesses = Object.entries(revByBiz)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, rev]) => ({ business: bizMap.get(id) as any, revenue: rev }));

      const avgRating = reviews.length
        ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        : 0;

      return {
        totals: {
          businesses: businesses.length,
          activeBusinesses: businesses.filter((b) => b.is_active).length,
          users: profiles.length,
          orders: orders.length,
          gmv,
          completedGmv,
          avgOrder,
          reviews: reviews.length,
          avgRating,
        },
        days,
        topCategories,
        topCities,
        topBusinesses,
      };
    },
  });

const StatCard = ({
  label, value, icon: Icon, color, bg, sub,
}: { label: string; value: string; icon: any; color: string; bg: string; sub?: string }) => (
  <Card className="rounded-xl border-border shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`rounded-lg p-1.5 ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

const PlatformOverviewTab = () => {
  const { data, isLoading } = usePlatformStats();

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Indlæser overblik...</div>;
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="GMV (samlet)" value={fmtKr(t.gmv)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-500/10" sub={`${fmtKr(t.completedGmv)} afsluttet`} />
        <StatCard label="Ordrer" value={fmt(t.orders)} icon={ShoppingCart} color="text-blue-600" bg="bg-blue-500/10" sub={`Snit ${fmtKr(t.avgOrder)}`} />
        <StatCard label="Virksomheder" value={fmt(t.businesses)} icon={Building2} color="text-violet-600" bg="bg-violet-500/10" sub={`${t.activeBusinesses} aktive`} />
        <StatCard label="Brugere" value={fmt(t.users)} icon={Users} color="text-amber-600" bg="bg-amber-500/10" sub={t.reviews ? `${t.avgRating.toFixed(1)} ★ snit` : "Ingen anmeldelser"} />
      </div>

      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Vækst — sidste 30 dage</p>
              <p className="text-xs text-muted-foreground">Daglige nye ordrer, brugere og virksomheder</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.days} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
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
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Top kategorier</p>
            </div>
            {data.topCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen data endnu</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topCategories.map(([cat, n]) => (
                  <li key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{cat}</span>
                    <span className="tabular-nums font-medium text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Top byer</p>
            </div>
            {data.topCities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen data endnu</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topCities.map(([city, n]) => (
                  <li key={city} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{city}</span>
                    <span className="tabular-nums font-medium text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Top virksomheder (omsætning)</p>
            </div>
            {data.topBusinesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen data endnu</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topBusinesses.map(({ business, revenue }) => (
                  <li key={business?.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{business?.name || "—"}</span>
                    <span className="tabular-nums font-medium text-muted-foreground">{fmtKr(revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformOverviewTab;
