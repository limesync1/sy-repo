import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, ShoppingCart, DollarSign, TrendingUp, MapPin, Tag, Star,
  ArrowUp, ArrowDown, Minus, Activity, MessageCircle, AlertTriangle, CreditCard,
  Clock, ChevronRight, Download,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader, StatCard, SectionCard } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ChartSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";

const fmt = (n: number) => n.toLocaleString("da-DK");
const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

/**
 * Henter et komplet overblik som ét aggregeret snapshot fra serveren.
 * Erstatter de tidligere 5 fulde tabel-hent — så det skalerer forbi
 * Supabase's 1000-rækkers loft og holder bundle-størrelsen lille.
 */
type OverviewSnapshot = {
  range: { from: string; to: string; days: number; prev_from: string; prev_to: string };
  kpis: { gmv: number; gmv_completed: number; orders: number; avg_order: number };
  prev: { gmv: number; orders: number; users: number; businesses: number };
  period_counts: { new_users: number; new_businesses: number };
  totals: { businesses_total: number; profiles_total: number; reviews_total: number; reviews_avg: number; mrr: number; active_subs: number };
  series: { date: string; orders: number; gmv: number; users: number; businesses: number }[];
  dow: { dow: number; count: number }[];
  top_categories: { label: string; value: number }[];
  top_cities: { label: string; value: number }[];
  top_businesses: { id: string; name: string; revenue: number }[];
  top_customers: { name: string; spend: number }[];
  repeat: { unique_customers: number; repeat_customers: number };
};

const useOverviewSnapshot = (from: Date, to: Date) =>
  useQuery({
    queryKey: ["admin-overview-snapshot", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_snapshot", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      return data as unknown as OverviewSnapshot;
    },
    staleTime: 30_000,
  });

// Live operationelle tællinger — refetch hvert 30. sek for "puls"-fornemmelse.
// Holdes adskilt fra det tunge dataset så vi ikke trækker alt hver halve minut.
const useOperationalPulse = () =>
  useQuery({
    queryKey: ["admin-operational-pulse"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();

      const [todayOrders, todaySignups, openChats, trialExpiring, pastDue,
             unansweredChats, lowRatedReviews, unverifiedBiz] = await Promise.all([
        supabase.from("orders")
          .select("id, total_amount", { count: "exact" })
          .gte("created_at", today.toISOString()),
        supabase.from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase.from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase.from("business_plans")
          .select("business_id", { count: "exact", head: true })
          .eq("status", "trialing")
          .lte("trial_ends_at", threeDays)
          .gte("trial_ends_at", new Date().toISOString()),
        supabase.from("business_plans")
          .select("business_id", { count: "exact", head: true })
          .in("status", ["past_due", "unpaid"]),
        supabase.from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .is("first_admin_reply_at", null)
          .lte("last_message_at", twoHoursAgo),
        supabase.from("reviews")
          .select("id", { count: "exact", head: true })
          .lte("rating", 2)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_verified", false)
          .eq("is_active", true),
      ]);

      const gmvToday = (todayOrders.data || []).reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0);
      return {
        ordersToday: todayOrders.count || 0,
        gmvToday,
        signupsToday: todaySignups.count || 0,
        openChats: openChats.count || 0,
        trialExpiring: trialExpiring.count || 0,
        pastDue: pastDue.count || 0,
        unansweredChats: unansweredChats.count || 0,
        lowRatedReviews: lowRatedReviews.count || 0,
        unverifiedBiz: unverifiedBiz.count || 0,
      };
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

/* Pulse-strip — kompakte live-tal øverst. Tone="dot" giver kun en lille
   farvet prik i venstre kant så stripen ikke konkurrerer med KPI-rækken. */
const PulseCard = ({
  label, value, icon: Icon, dot,
}: { label: string; value: string; icon: any; dot: "emerald" | "blue" | "violet" | "amber" | "muted" }) => {
  const dots: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-accent",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    muted: "bg-muted-foreground/40",
  };
  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardContent className="flex items-center gap-2.5 p-3">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dots[dot])} />
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">{label}</p>
          <p className="text-base font-bold tabular-nums leading-tight text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ActionCard — operationel arbejdskø. Klik navigerer til den relevante fane. */
const ActionCard = ({
  count, label, hint, icon: Icon, tone, onClick,
}: { count: number; label: string; hint: string; icon: any; tone: "danger" | "warn" | "info"; onClick?: () => void }) => {
  const tones: Record<string, string> = {
    danger: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive",
    warn: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700",
    info: "border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent",
  };
  const disabled = count === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors w-full",
        disabled ? "border-border bg-secondary/30 text-muted-foreground cursor-default" : tones[tone],
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        disabled ? "bg-secondary" : "bg-background/80")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-2xl font-bold leading-none tabular-nums text-foreground">
          {count}
          {!disabled && <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />}
        </p>
        <p className="mt-1 text-sm font-semibold leading-tight text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </div>
    </button>
  );
};

interface OverviewProps { onNavigate?: (tab: string) => void }

const PlatformOverviewTab = ({ onNavigate }: OverviewProps) => {
  const { from, to, rangeLabel } = useAdminFilters();
  const { data, isLoading } = useOverviewSnapshot(from, to);
  const { data: pulse } = useOperationalPulse();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <StatGridSkeleton count={4} />
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ListCardSkeleton rows={5} />
      </div>
    );
  }

  // Alle aggregater kommer nu fra serveren — kun let formattering tilbage.
  const { kpis, prev, period_counts, totals, series, dow, top_categories, top_cities, top_businesses, top_customers, repeat } = data;
  const days = series;
  const sparkOrders = days.map((d) => ({ v: d.orders }));
  const sparkUsers = days.map((d) => ({ v: d.users }));
  const sparkGmv = days.map((d) => ({ v: d.gmv }));
  const sparkBiz = days.map((d) => ({ v: d.businesses }));

  const dayOfWeek = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const orderByDow = [0, 0, 0, 0, 0, 0, 0];
  dow.forEach((d) => { orderByDow[d.dow] = Number(d.count) || 0; });
  const bestDow = orderByDow.indexOf(Math.max(...orderByDow));

  const repeatRate = repeat.unique_customers ? (repeat.repeat_customers / repeat.unique_customers) * 100 : 0;
  const topBusinesses = top_businesses.map((b) => ({ business: { id: b.id, name: b.name }, revenue: Number(b.revenue) || 0 }));
  const topCustomers = top_customers.map((c) => ({ name: c.name, spend: Number(c.spend) || 0 }));

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

      {/* Pulse-strip — live i dag */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PulseCard label="Ordrer i dag" value={fmt(pulse?.ordersToday ?? 0)} icon={ShoppingCart} dot="blue" />
        <PulseCard label="GMV i dag" value={fmtKr(pulse?.gmvToday ?? 0)} icon={DollarSign} dot="emerald" />
        <PulseCard label="Nye signups i dag" value={fmt(pulse?.signupsToday ?? 0)} icon={Users} dot="violet" />
        <PulseCard label="Åbne samtaler" value={fmt(pulse?.openChats ?? 0)} icon={MessageCircle} dot="amber" />
      </div>

      {/* Operationel arbejdskø — det admin skal handle på lige nu */}
      <SectionCard
        title="Kræver handling"
        icon={<Activity />}
        description="Klik på et kort for at gå til den relevante fane"
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <ActionCard
            count={pulse?.trialExpiring ?? 0}
            label="Trial udløber snart"
            hint="Inden for 3 dage"
            icon={Clock}
            tone="warn"
            onClick={() => onNavigate?.("businesses")}
          />
          <ActionCard
            count={pulse?.pastDue ?? 0}
            label="Forfaldne betalinger"
            hint="Past due / unpaid"
            icon={CreditCard}
            tone="danger"
            onClick={() => onNavigate?.("subscriptions")}
          />
          <ActionCard
            count={pulse?.unansweredChats ?? 0}
            label="Ubesvarede samtaler"
            hint="Over 2 timer uden svar"
            icon={MessageCircle}
            tone="warn"
            onClick={() => onNavigate?.("livechat")}
          />
          <ActionCard
            count={pulse?.lowRatedReviews ?? 0}
            label="Lave anmeldelser"
            hint="≤ 2 stjerner sidste 7 dage"
            icon={Star}
            tone="warn"
            onClick={() => onNavigate?.("reviews")}
          />
          <ActionCard
            count={pulse?.unverifiedBiz ?? 0}
            label="Uverificerede virksomheder"
            hint="Aktive uden verifikation"
            icon={AlertTriangle}
            tone="info"
            onClick={() => onNavigate?.("businesses")}
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="GMV" value={fmtKr(Number(kpis.gmv))} icon={DollarSign} tone="emerald"
          sub={`${fmtKr(Number(kpis.gmv_completed))} afsluttet`} trend={trendPct(Number(kpis.gmv), Number(prev.gmv))} spark={sparkGmv} />
        <KpiCard label="Ordrer" value={fmt(Number(kpis.orders))} icon={ShoppingCart} tone="blue"
          sub={`Snit ${fmtKr(Number(kpis.avg_order))}`} trend={trendPct(Number(kpis.orders), Number(prev.orders))} spark={sparkOrders} />
        <KpiCard label="Nye virksomheder" value={fmt(period_counts.new_businesses)} icon={Building2} tone="violet"
          sub={`${totals.businesses_total} i alt`} trend={trendPct(period_counts.new_businesses, Number(prev.businesses))} spark={sparkBiz} />
        <KpiCard label="Nye brugere" value={fmt(period_counts.new_users)} icon={Users} tone="amber"
          sub={`${totals.profiles_total} i alt`} trend={trendPct(period_counts.new_users, Number(prev.users))} spark={sparkUsers} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR (cyklisk)" value={fmtKr(Number(totals.mrr))} icon={<DollarSign />} tone="emerald" hint={`${totals.active_subs} aktive abonnementer`} />
        <StatCard label="Genkøbsrate" value={`${repeatRate.toFixed(0)}%`} icon={<Users />} tone="blue" hint={`${repeat.repeat_customers} af ${repeat.unique_customers} kunder`} />
        <StatCard label="Bedste ugedag" value={orderByDow[bestDow] > 0 ? dayOfWeek[bestDow] : "—"} icon={<TrendingUp />} tone="violet" hint={`${orderByDow[bestDow]} ordrer`} />
        <StatCard label="Anmeldelser" value={String(totals.reviews_total)} icon={<Star />} tone="amber"
          hint={totals.reviews_total ? `${Number(totals.reviews_avg).toFixed(1)} ★ snit` : "Ingen endnu"} />
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

      {/* Top-lister konsolideret i én tab-baseret komponent */}
      <SectionCard title="Top-lister" icon={<Star />} description={`Sammenlignet over ${rangeLabel.toLowerCase()}`}>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Kategorier</TabsTrigger>
            <TabsTrigger value="cities" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Byer</TabsTrigger>
            <TabsTrigger value="businesses" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Virksomheder</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Kunder</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <BarList items={top_categories.map((c) => ({ label: c.label, value: Number(c.value) }))} tone="accent" empty="Ingen data endnu" />
          </TabsContent>
          <TabsContent value="cities" className="mt-4">
            <BarList items={top_cities.map((c) => ({ label: c.label, value: Number(c.value) }))} tone="foreground" empty="Ingen data endnu" />
          </TabsContent>
          <TabsContent value="businesses" className="mt-4">
            {topBusinesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen omsætning i perioden</p>
            ) : (
              <ul className="space-y-1.5">
                {topBusinesses.map(({ business, revenue }) => (
                  <li key={business?.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="truncate text-foreground">{business?.name || "—"}</span>
                    <span className="tabular-nums font-medium text-foreground">{fmtKr(revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="customers" className="mt-4">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen kunder i perioden</p>
            ) : (
              <ul className="space-y-1.5">
                {topCustomers.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="truncate text-foreground">{c.name}</span>
                    <span className="tabular-nums font-medium text-foreground">{fmtKr(c.spend)}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SectionCard>
    </div>
  );
};

/* BarList — genbrugelig liste-visning med progress-bar bag tekst.
   Bruges i Top-lister tabs så kategorier/byer ser ens ud. */
function BarList({ items, tone, empty }: { items: { label: string; value: number }[]; tone: "accent" | "foreground"; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground truncate">{it.label}</span>
            <span className="tabular-nums font-medium text-muted-foreground">{it.value}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className={cn("h-full", tone === "accent" ? "bg-accent" : "bg-foreground")} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default PlatformOverviewTab;
