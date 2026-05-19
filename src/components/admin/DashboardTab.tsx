import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake, DollarSign, Star, Briefcase, TrendingUp,
  ArrowRight, AlertCircle, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2,
  Share2, Eye, Calendar, MessageSquare, Link2, Copy, Check,
  Zap, Target, Settings as SettingsIcon, Users,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  business: Business;
  ordersCount: number;
  revenue: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  pendingOrders: number;
  recentOrders: any[];
  reviews?: any[];
  services?: any[];
  onNavigate?: (tab: string) => void;
}

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const fmtKrShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mio`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return Math.round(n).toLocaleString("da-DK");
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Godnat";
  if (h < 10) return "Godmorgen";
  if (h < 13) return "God formiddag";
  if (h < 17) return "God eftermiddag";
  if (h < 22) return "Godaften";
  return "Godnat";
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DashboardTab = ({
  business, ordersCount, revenue, servicesCount, averageRating, reviewsCount,
  pendingOrders, recentOrders, reviews, services, onNavigate,
}: Props) => {
  const [copied, setCopied] = useState(false);

  // ── Periode-aggregat: dag/uge/30-dage + sparkline-data ───────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const isRevenue = (o: any) => o.status !== "cancelled";
    const orderAmount = (o: any) => Number(o.total_amount) || 0;

    // Bucket pr. dag for de seneste 14 dage (idx 0 = ældste, 13 = i dag)
    const buckets14 = Array.from({ length: 14 }, () => ({ rev: 0, count: 0 }));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    (recentOrders || []).forEach((o: any) => {
      const t = +new Date(o.created_at);
      const dayIdx = 13 - Math.floor((+todayStart - new Date(t).setHours(0,0,0,0)) / DAY_MS);
      if (dayIdx >= 0 && dayIdx <= 13) {
        buckets14[dayIdx].count++;
        if (isRevenue(o)) buckets14[dayIdx].rev += orderAmount(o);
      }
    });

    const sum = (arr: { rev: number; count: number }[], from: number, to: number) =>
      arr.slice(from, to).reduce((acc, b) => ({ rev: acc.rev + b.rev, count: acc.count + b.count }), { rev: 0, count: 0 });

    const last7 = sum(buckets14, 7, 14);
    const prev7 = sum(buckets14, 0, 7);

    // 30-dages perioder
    const cutNow = now - 30 * DAY_MS;
    const cutPrev = now - 60 * DAY_MS;
    const cur30 = (recentOrders || []).filter((o) => +new Date(o.created_at) >= cutNow);
    const prev30 = (recentOrders || []).filter((o) => {
      const t = +new Date(o.created_at);
      return t >= cutPrev && t < cutNow;
    });
    const sumRev = (xs: any[]) => xs.filter(isRevenue).reduce((s, o) => s + orderAmount(o), 0);

    const tomorrowStart = +todayStart + DAY_MS;
    const todayOrders = (recentOrders || []).filter((o) => {
      const t = +new Date(o.created_at);
      return t >= +todayStart && t < tomorrowStart;
    });

    return {
      buckets14,
      revenue7: last7.rev, revenuePrev7: prev7.rev,
      orders7: last7.count, ordersPrev7: prev7.count,
      revenue30: sumRev(cur30), revenuePrev30: sumRev(prev30),
      orders30: cur30.length, ordersPrev30: prev30.length,
      todayCount: todayOrders.length,
      todayRevenue: sumRev(todayOrders),
    };
  }, [recentOrders]);

  const trend = (current: number, prev: number) => {
    if (prev === 0 && current === 0) return { pct: 0, dir: "flat" as const };
    if (prev === 0) return { pct: 100, dir: "up" as const };
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct: Math.abs(pct), dir: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "flat" as const };
  };
  const revTrend = trend(stats.revenue7, stats.revenuePrev7);
  const ordTrend = trend(stats.orders7, stats.ordersPrev7);

  // ── Nye anmeldelser sidste 7 dage ───────────────────────────────────
  const newReviews = useMemo(() => {
    if (!reviews) return 0;
    const cut = Date.now() - 7 * DAY_MS;
    return reviews.filter((r: any) => +new Date(r.created_at) >= cut).length;
  }, [reviews]);

  // ── Top services efter omsætning ────────────────────────────────────
  const topServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    services.forEach((s: any) => map.set(s.id, { name: s.name, revenue: 0, count: 0 }));
    (recentOrders || []).filter((o) => o.status !== "cancelled").forEach((o: any) => {
      const items = (o.order_items as any[]) || [];
      items.forEach((it) => {
        const entry = map.get(it.service_id);
        if (!entry) return;
        entry.revenue += Number(it.total_price ?? it.unit_price ?? 0);
        entry.count += Number(it.quantity ?? 1);
      });
    });
    return Array.from(map.values())
      .filter((s) => s.revenue > 0 || s.count > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [services, recentOrders]);
  const topRevenue = topServices[0]?.revenue || 0;

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
  };

  // ── Profilfuldendelse ───────────────────────────────────────────────
  const completeness = useMemo(() => {
    const checks = [
      { label: "Virksomhedsnavn", done: !!business.name },
      { label: "Beskrivelse", done: !!business.description },
      { label: "Logo", done: !!business.logo_url },
      { label: "Coverbillede", done: !!business.cover_image_url },
      { label: "Telefon", done: !!business.phone },
      { label: "Email", done: !!business.email },
      { label: "Adresse", done: !!business.address },
      { label: "By", done: !!business.city },
      { label: "Services tilføjet", done: servicesCount > 0 },
      { label: "Åbningstider", done: business.opening_hours && Object.keys(business.opening_hours as Record<string, unknown>).length > 0 },
    ];
    const doneCount = checks.filter(c => c.done).length;
    return { checks, doneCount, total: checks.length, pct: Math.round((doneCount / checks.length) * 100) };
  }, [business, servicesCount]);
  const missingItems = completeness.checks.filter(c => !c.done);

  // ── Auto-insight — én smart sætning baseret på state ────────────────
  const insight = (() => {
    if (servicesCount === 0) return "Tilføj din første service — det er det eneste, der mangler før kunder kan booke.";
    if (pendingOrders >= 3) return `${pendingOrders} bestillinger venter på svar — hver time tæller for konvertering.`;
    if (ordersCount === 0 && completeness.pct >= 70) return "Profilen er klar. Del jeres link for at få de første bestillinger.";
    if (revTrend.dir === "up" && stats.revenue7 > 0) return `Omsætningen er vokset ${revTrend.pct}% i denne uge — momentum er på jeres side.`;
    if (revTrend.dir === "down" && stats.revenuePrev7 > 0) return `Omsætningen er ${revTrend.pct}% under sidste uge — overvej at dele profilen eller justere priserne.`;
    if (reviewsCount === 0 && ordersCount > 0) return "I har afsluttede opgaver uden anmeldelser endnu — bed jeres glade kunder om en stjerne.";
    if (averageRating >= 4.5 && reviewsCount >= 3) return `${averageRating.toFixed(1)}★ over ${reviewsCount} anmeldelser — stærk profil. Vis den frem.`;
    return "Hold svartid lav og profilen opdateret — det er de to ting der flytter mest på konverteringen.";
  })();

  // ── Smart prioriteret handlingskø ───────────────────────────────────
  type Action = {
    key: string; label: string; meta: string; icon: React.ComponentType<{ className?: string }>;
    tab?: string; onClick?: () => void; priority: number; badge?: string; tone: "primary" | "accent" | "muted";
  };
  const shareUrl = business.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/v/${business.slug}` : "";
  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link kopieret");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Kunne ikke kopiere"); }
  };

  const actions: Action[] = [];
  if (pendingOrders > 0) actions.push({
    key: "pending", label: `Svar ${pendingOrders} afventende ${pendingOrders === 1 ? "bestilling" : "bestillinger"}`,
    meta: "Hurtigt svar fordobler konverteringen", icon: Zap, tab: "orders", priority: 100, badge: String(pendingOrders), tone: "primary",
  });
  if (servicesCount === 0) actions.push({
    key: "first-service", label: "Opret din første service",
    meta: "Kunder kan ikke booke uden services", icon: Briefcase, tab: "services", priority: 95, tone: "primary",
  });
  if (completeness.pct < 80) actions.push({
    key: "complete", label: "Fuldfør profil",
    meta: `${completeness.pct}% færdig · ${missingItems.length} ting tilbage`, icon: Target, tab: "settings", priority: 80, tone: "accent",
  });
  if (reviewsCount === 0 && ordersCount > 0) actions.push({
    key: "ask-review", label: "Bed kunder om anmeldelse",
    meta: "Anmeldelser hæver konvertering markant", icon: Star, tab: "reviews", priority: 70, tone: "accent",
  });
  if (newReviews > 0) actions.push({
    key: "new-reviews", label: `${newReviews} ${newReviews === 1 ? "ny anmeldelse" : "nye anmeldelser"}`,
    meta: "Kvittér og vis at I lytter", icon: MessageSquare, tab: "reviews", priority: 65, badge: String(newReviews), tone: "accent",
  });
  if (shareUrl) actions.push({
    key: "share", label: copied ? "Link kopieret" : "Del din profil",
    meta: shareUrl.replace(/^https?:\/\//, ""), icon: copied ? Check : Link2, onClick: copyLink, priority: 50, tone: "muted",
  });
  actions.push({ key: "new-service", label: "Tilføj service", meta: "Udvid jeres tilbud", icon: Briefcase, tab: "services", priority: 30, tone: "muted" });
  actions.push({ key: "team", label: "Medarbejdere", meta: "Inviter dit team", icon: Users, tab: "employees", priority: 20, tone: "muted" });
  actions.push({ key: "settings", label: "Indstillinger", meta: "Profil, kontakt, åbningstider", icon: SettingsIcon, tab: "settings", priority: 10, tone: "muted" });
  actions.sort((a, b) => b.priority - a.priority);
  const primaryActions = actions.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* ── Hero welcome panel — matcher forsidens hero (dark + cyan glows) ── */}
      <section
        className="relative isolate overflow-hidden rounded-2xl px-5 py-6 text-background sm:px-8 sm:py-8"
        style={{ backgroundColor: "hsl(var(--hero-bg))" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-[110px] opacity-25 animate-blob-slow"
            style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
          />
          <div
            className="absolute -bottom-32 right-[-10%] h-[26rem] w-[26rem] rounded-full blur-[100px] opacity-30"
            style={{ backgroundColor: "hsl(var(--hero-mid))" }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(ellipse 70% 60% at 75% 50%, hsl(var(--hero-mid) / 0.22), transparent 60%)" }}
          />
          <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-background/55">
              {greeting()} · {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.02em] text-background sm:text-3xl lg:text-[2rem]">
              {business.name}
            </h1>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-background/80 sm:text-[15px]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
              <span>{insight}</span>
            </p>
          </div>

          {business.slug && (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <a
                href={`/v/${business.slug}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3.5 py-2 text-xs font-semibold text-background backdrop-blur-sm transition-colors hover:bg-background/15"
              >
                <Eye className="h-3.5 w-3.5" /> Se din side
              </a>
              <button
                type="button" onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-[hsl(var(--hero-bg))] transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(110deg, hsl(var(--hero-cyan)) 0%, hsl(var(--hero-cyan-bright)) 100%)" }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Kopieret" : "Del profil"}
              </button>
            </div>
          )}
        </div>

        {/* Snapshot-pille: i dag */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SnapshotPill label="I dag" value={String(stats.todayCount)} sub={`${fmtKrShort(stats.todayRevenue)} kr`} />
          <SnapshotPill label="Denne uge" value={String(stats.orders7)} sub={`${fmtKrShort(stats.revenue7)} kr`} />
          <SnapshotPill label="Afventer" value={String(pendingOrders)} sub={pendingOrders > 0 ? "Skal besvares" : "Alt besvaret"} accent={pendingOrders > 0} />
          <SnapshotPill label="Bedømmelse" value={reviewsCount > 0 ? `${averageRating.toFixed(1)}★` : "–"} sub={`${reviewsCount} ${reviewsCount === 1 ? "anmeldelse" : "anmeldelser"}`} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="space-y-4">
          {/* Periode-stat-kort med sparklines */}
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartStatCard
              label="Omsætning · 7 dage"
              value={fmtKr(stats.revenue7)}
              hint={stats.revenuePrev7 > 0 ? `Forrige uge: ${fmtKr(stats.revenuePrev7)}` : "Ingen sammenligning endnu"}
              icon={<DollarSign />}
              trend={revTrend}
              sparkline={stats.buckets14.map((b) => b.rev)}
            />
            <SmartStatCard
              label="Bestillinger · 7 dage"
              value={stats.orders7}
              hint={stats.ordersPrev7 > 0 ? `Forrige uge: ${stats.ordersPrev7}` : "Ingen sammenligning endnu"}
              icon={<Handshake />}
              trend={ordTrend}
              sparkline={stats.buckets14.map((b) => b.count)}
            />
          </div>

          {/* Seneste bestillinger */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Hurtigt overblik over de nyeste aftaler og deres status.</p>
              </div>
              {recentOrders.length > 0 && (
                <button onClick={() => onNavigate?.("orders")} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Se alle <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {recentOrders.slice(0, 5).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onNavigate?.("orders")}
                    className="grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 sm:grid-cols-[minmax(0,1.1fr)_auto_auto] sm:items-center sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{order.customer_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors[order.status] || ""} w-fit border px-2 py-0.5 text-xs font-medium`}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                      {order.status === "pending" && <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">{order.total_amount} kr</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <EmptyState icon={<TrendingUp />} title="Ingen bestillinger endnu" description="Bestillinger vil vises her, så snart de kommer ind." />
              </div>
            )}
          </Card>

          {/* Top services */}
          {topServices.length > 0 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Bedst sælgende services</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Det her tjener I mest på lige nu — gør gerne mere af det samme.</p>
                </div>
                <button onClick={() => onNavigate?.("services")} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Se alle <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {topServices.map((s, i) => {
                  const pct = topRevenue > 0 ? Math.max(6, Math.round((s.revenue / topRevenue) * 100)) : 0;
                  return (
                    <div key={s.name + i} className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-foreground">{i + 1}</span>
                          {s.name}
                        </p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{fmtKr(s.revenue)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--hero-mid)), hsl(var(--hero-cyan-bright)))" }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{s.count} stk solgt</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          {/* Smart Quick Actions */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Hurtige handlinger</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Prioriteret efter hvad der flytter mest lige nu.</p>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid gap-2">
                {primaryActions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => a.onClick ? a.onClick() : (a.tab && onNavigate?.(a.tab))}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                      a.tone === "primary" && "border-foreground/15 bg-foreground text-background hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_hsl(var(--foreground)/0.5)]",
                      a.tone === "accent" && "border-accent/30 bg-accent/[0.06] hover:border-accent/50 hover:bg-accent/[0.10]",
                      a.tone === "muted" && "border-border bg-card hover:border-foreground/20 hover:bg-secondary/60",
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4",
                      a.tone === "primary" && "bg-background/15 text-background",
                      a.tone === "accent" && "bg-accent/15 text-accent",
                      a.tone === "muted" && "border border-border bg-secondary text-foreground",
                    )}>
                      <a.icon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-semibold", a.tone === "primary" ? "text-background" : "text-foreground")}>{a.label}</p>
                        {a.badge && (
                          <span className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                            a.tone === "primary" ? "bg-background/20 text-background" : "bg-accent/15 text-accent",
                          )}>{a.badge}</span>
                        )}
                      </div>
                      <p className={cn(
                        "truncate text-xs",
                        a.tone === "primary" ? "text-background/70" : "text-muted-foreground",
                      )}>{a.meta}</p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                      a.tone === "primary" ? "text-background/60" : "text-muted-foreground",
                    )} />
                  </button>
                ))}
              </div>

              {actions.length > primaryActions.length && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <span className="inline-flex items-center gap-1">
                      Vis {actions.length - primaryActions.length} flere
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-1.5">
                    {actions.slice(primaryActions.length).map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => a.onClick ? a.onClick() : (a.tab && onNavigate?.(a.tab))}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary/60"
                      >
                        <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate text-xs font-medium text-foreground">{a.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>

          {/* Profilfuldendelse */}
          {completeness.pct < 100 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Profilfuldendelse</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Jo mere komplet profilen er, jo stærkere står I udadtil.</p>
                  </div>
                  <div className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                    {completeness.pct}%
                  </div>
                </div>

                <Progress value={completeness.pct} className="mt-4 h-2" />

                <div className="mt-4 space-y-2">
                  {missingItems.slice(0, 3).map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label} mangler</span>
                    </div>
                  ))}
                  {missingItems.length === 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Profilen er komplet</span>
                    </div>
                  )}
                </div>

                <Button size="sm" variant="outline" className="mt-4 h-9 w-full rounded-lg text-sm" onClick={() => onNavigate?.("settings")}>
                  Fuldfør profil
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */

/** Lille pille i hero-stripen — kompakt KPI med label/værdi/sub. */
const SnapshotPill = ({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) => (
  <div className={cn(
    "rounded-xl border px-3 py-2.5 backdrop-blur-sm",
    accent ? "border-amber-300/40 bg-amber-400/[0.10]" : "border-background/10 bg-background/[0.05]",
  )}>
    <p className="text-[10px] font-medium uppercase tracking-wider text-background/60">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-background sm:text-xl">{value}</p>
    <p className="mt-0.5 truncate text-[11px] text-background/65">{sub}</p>
  </div>
);

/** Sparkline — 14 dages mini-søjler. Sidste søjle (i dag) fremhæves. */
const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {data.map((v, i) => {
        const h = Math.max(8, Math.round((v / max) * 100));
        const isToday = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-sm transition-colors",
              isToday ? "bg-foreground" : v > 0 ? "bg-foreground/35" : "bg-foreground/10",
            )}
            style={{ height: `${h}%` }}
            aria-hidden
          />
        );
      })}
    </div>
  );
};

/** SmartStatCard — stat med trend-pille og sparkline. */
const SmartStatCard = ({
  label, value, hint, icon, trend, sparkline,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
  sparkline?: number[];
}) => {
  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums text-foreground sm:text-[1.75rem]">{value}</p>
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              trend.dir === "up" && "bg-emerald-500/10 text-emerald-700",
              trend.dir === "down" && "bg-rose-500/10 text-rose-700",
              trend.dir === "flat" && "bg-secondary text-muted-foreground",
            )}>
              {trend.dir === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trend.dir === "down" && <ArrowDownRight className="h-3 w-3" />}
              {trend.dir === "flat" && <Minus className="h-3 w-3" />}
              {trend.dir === "flat" ? "uændret" : `${trend.pct}%`}
            </span>
          )}
        </div>
        {sparkline && sparkline.some((v) => v > 0) && (
          <div className="mt-3"><Sparkline data={sparkline} /></div>
        )}
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
};

export default DashboardTab;