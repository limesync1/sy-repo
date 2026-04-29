import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake, DollarSign, Star, Briefcase, TrendingUp, TrendingDown,
  ArrowRight, AlertCircle, MapPin, ChevronRight, Clock, MessageSquare,
  Eye, Calendar, Sparkles, ArrowUpRight, ArrowDownRight, Minus, CheckCircle2,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo } from "react";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";

interface Props {
  business: Business;
  ordersCount: number;
  revenue: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  pendingOrders: number;
  recentOrders: any[];
  /** Komplet liste af reviews — bruges til "nye anmeldelser siden sidst". */
  reviews?: any[];
  /** Komplet liste af services — bruges til top-services. */
  services?: any[];
  onNavigate?: (tab: string) => void;
}

const fmtKr = (n: number) =>
  `${Math.round(n).toLocaleString("da-DK")} kr`;

const DashboardTab = ({ business, ordersCount, revenue, servicesCount, averageRating, reviewsCount, pendingOrders, recentOrders, reviews, services, onNavigate }: Props) => {
  // ── Periode-sammenligning: sidste 30 dage vs. de 30 forudgående ─────
  // Det giver virksomheden et reelt billede af om det går frem eller tilbage,
  // i stedet for blot et historisk total.
  const periods = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const cutNow = now - 30 * DAY;
    const cutPrev = now - 60 * DAY;

    const inPeriod = (o: any, from: number, to: number) => {
      const t = +new Date(o.created_at);
      return t >= from && t < to;
    };
    const isRevenue = (o: any) => o.status !== "cancelled";

    const current = (recentOrders || []).filter((o) => inPeriod(o, cutNow, now));
    const prev = (recentOrders || []).filter((o) => inPeriod(o, cutPrev, cutNow));

    const sum = (xs: any[]) =>
      xs.filter(isRevenue).reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + DAY);
    const todayOrders = (recentOrders || []).filter((o) =>
      inPeriod(o, +todayStart, +tomorrowStart),
    );

    return {
      revenue30: sum(current),
      revenuePrev30: sum(prev),
      orders30: current.length,
      ordersPrev30: prev.length,
      todayOrdersCount: todayOrders.length,
      todayRevenue: sum(todayOrders),
    };
  }, [recentOrders]);

  const trend = (current: number, prev: number) => {
    if (prev === 0 && current === 0) return { pct: 0, dir: "flat" as const };
    if (prev === 0) return { pct: 100, dir: "up" as const };
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct: Math.abs(pct), dir: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("flat" as const) };
  };
  const revTrend = trend(periods.revenue30, periods.revenuePrev30);
  const ordTrend = trend(periods.orders30, periods.ordersPrev30);

  // ── Nye anmeldelser siden sidste login (sidste 7 dage som proxy) ─────
  const newReviews = useMemo(() => {
    if (!reviews) return 0;
    const cut = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return reviews.filter((r: any) => +new Date(r.created_at) >= cut).length;
  }, [reviews]);

  // ── Top 3 services efter omsætning ───────────────────────────────────
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

  // Profile completeness
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
  const recentPending = recentOrders.filter((order) => order.status === "pending").length;

  // ── Smart prioriteret "Kræver opmærksomhed"-kø ───────────────────────
  // Vi viser maks 3 ting der reelt skal handles på lige nu — i prioritet:
  // 1) Afventende bestillinger (taber omsætning hvis ikke besvaret)
  // 2) Nye anmeldelser (skal kvitteres for)
  // 3) Profil-mangler der koster konvertering
  const attentionItems: Array<{
    title: string; meta: string; tone: "amber" | "violet" | "rose" | "blue";
    icon: React.ComponentType<{ className?: string }>; tab: string;
  }> = [];
  if (pendingOrders > 0) {
    attentionItems.push({
      title: `${pendingOrders} afventende ${pendingOrders === 1 ? "bestilling" : "bestillinger"}`,
      meta: "Svar inden for 2 timer for bedst konvertering",
      tone: "amber", icon: Handshake, tab: "orders",
    });
  }
  if (newReviews > 0) {
    attentionItems.push({
      title: `${newReviews} ${newReviews === 1 ? "ny anmeldelse" : "nye anmeldelser"}`,
      meta: "Et hurtigt svar viser nye kunder at I lytter",
      tone: "violet", icon: Star, tab: "reviews",
    });
  }
  if (completeness.pct < 80 && missingItems.length > 0) {
    attentionItems.push({
      title: `Profilen mangler ${missingItems.length} ${missingItems.length === 1 ? "ting" : "ting"}`,
      meta: missingItems.slice(0, 2).map((m) => m.label).join(", ") + (missingItems.length > 2 ? "…" : ""),
      tone: "blue", icon: AlertCircle, tab: "settings",
    });
  }

  // ── Smart auto-genereret indsigt — én sætning der opsummerer ─────────
  const insight = (() => {
    if (ordersCount === 0 && servicesCount === 0) {
      return "Tilføj jeres første service — det er det eneste der skal til, før kunder kan booke jer.";
    }
    if (ordersCount === 0 && servicesCount > 0 && completeness.pct >= 70) {
      return "Profilen er klar. Del jeres link på Facebook eller hjemmesiden for at få de første bestillinger.";
    }
    if (revTrend.dir === "up" && periods.revenue30 > 0) {
      return `Omsætningen er vokset ${revTrend.pct}% i denne måned sammenlignet med sidste — bliv ved med det I gør.`;
    }
    if (revTrend.dir === "down" && periods.revenuePrev30 > 0) {
      return `Omsætningen er faldet ${revTrend.pct}% i denne måned. Overvej at dele profilen igen eller tilføje en pakke.`;
    }
    if (averageRating >= 4.5 && reviewsCount >= 3) {
      return `Med ${averageRating.toFixed(1)}★ over ${reviewsCount} anmeldelser har I et stærkt udgangspunkt. Vis det frem ved at dele profilen.`;
    }
    if (reviewsCount === 0 && ordersCount > 0) {
      return "I har afsluttet bestillinger uden at få anmeldelser endnu. Bed jeres glade kunder om at anmelde jer — det dobler typisk konverteringen.";
    }
    return "Hold øje med afventende bestillinger og svar hurtigt — det er den enkelte ting der flytter mest på jeres konvertering.";
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title={business.name}
        description={
          <span className="inline-flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{insight}</span>
          </span>
        }
        action={business.slug ? (
          <a href={`/v/${business.slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            <Eye className="h-3.5 w-3.5" /> Se jeres profil <ArrowRight className="h-3 w-3" />
          </a>
        ) : null}
      />

      {/* Smart "Kræver opmærksomhed"-kø — kun vis når der faktisk er noget */}
      {attentionItems.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-4 py-2.5 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kræver opmærksomhed
            </p>
          </div>
          <div className="divide-y divide-border">
            {attentionItems.map((it) => (
              <button
                key={it.title}
                type="button"
                onClick={() => onNavigate?.(it.tab)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 sm:px-5"
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  it.tone === "amber" && "bg-amber-500/10 text-amber-700",
                  it.tone === "violet" && "bg-violet-500/10 text-violet-700",
                  it.tone === "rose" && "bg-rose-500/10 text-rose-700",
                  it.tone === "blue" && "bg-blue-500/10 text-blue-700",
                )}>
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{it.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.meta}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="space-y-3">
          {/* Periode-fokuserede stat-kort: viser hvordan det går NU + delta */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SmartStatCard
              label="Omsætning, 30 dage"
              value={fmtKr(periods.revenue30)}
              hint={periods.revenuePrev30 > 0 ? `Forrige periode: ${fmtKr(periods.revenuePrev30)}` : "Ingen sammenligning endnu"}
              icon={<DollarSign />}
              trend={revTrend}
            />
            <SmartStatCard
              label="Bestillinger, 30 dage"
              value={periods.orders30}
              hint={periods.ordersPrev30 > 0 ? `Forrige: ${periods.ordersPrev30}` : "Ingen sammenligning endnu"}
              icon={<Handshake />}
              trend={ordTrend}
            />
            <SmartStatCard
              label="I dag"
              value={periods.todayOrdersCount}
              hint={periods.todayRevenue > 0 ? `${fmtKr(periods.todayRevenue)} omsat i dag` : "Ingen bestillinger endnu i dag"}
              icon={<Calendar />}
            />
            <SmartStatCard
              label="Bedømmelse"
              value={reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–"}
              hint={
                reviewsCount === 0
                  ? "Bed jeres første kunde om en anmeldelse"
                  : newReviews > 0
                    ? `${newReviews} ny${newReviews === 1 ? "" : "e"} sidste 7 dage`
                    : `${reviewsCount} anmeldelser i alt`
              }
              icon={<Star />}
            />
          </div>

          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Hurtigt overblik over de nyeste aftaler og deres status.</p>
              </div>
              {recentOrders.length > 0 && (
                <button onClick={() => onNavigate?.("orders")} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Se alle
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
                      {order.status === "pending" && <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
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
                <EmptyState
                  icon={<TrendingUp />}
                  title="Ingen bestillinger endnu"
                  description="Bestillinger vil vises her, så snart de kommer ind."
                />
              </div>
            )}
          </Card>

          {/* Top services efter omsætning — kun når data findes */}
          {topServices.length > 0 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Bedst sælgende services</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Det her tjener I mest på lige nu — gør gerne mere af det samme.</p>
                </div>
                <button onClick={() => onNavigate?.("services")} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Se alle
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
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{s.count} {s.count === 1 ? "stk solgt" : "stk solgt"}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Hurtige handlinger</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">De vigtigste genveje i panelet.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5">
                {[
                  { label: "Tilføj service", meta: "Opdater dit tilbud", icon: Briefcase, tab: "services" },
                  { label: "Se bestillinger", meta: recentPending > 0 ? `${recentPending} afventer svar` : "Alt er besvaret", icon: Handshake, tab: "orders" },
                  { label: "Anmeldelser", meta: reviewsCount === 0 ? "Ingen endnu — bed jeres første" : `${reviewsCount} anmeldelser · ${averageRating.toFixed(1)}★`, icon: Star, tab: "reviews" },
                  { label: "Indstillinger", meta: "Profil, kontakt og side", icon: MapPin, tab: "settings" },
                ].map((action) => (
                  <button
                    key={action.tab}
                    type="button"
                    onClick={() => onNavigate?.(action.tab)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-secondary/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground [&_svg]:h-4 [&_svg]:w-4">
                      <action.icon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{action.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{action.meta}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {completeness.pct < 100 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Profilfuldendelse</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Jo mere komplet profilen er, jo stærkere står din virksomhed udadtil.</p>
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

/**
 * SmartStatCard — stat med indbygget delta-pille.
 * Vises uden trend hvis `trend` ikke er sat (fx "I dag").
 */
const SmartStatCard = ({
  label, value, hint, icon, trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
}) => {
  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
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
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
};

export default DashboardTab;
