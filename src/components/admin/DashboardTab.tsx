import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake, DollarSign, Star, Briefcase, Clock, TrendingUp,
  ArrowRight, AlertCircle, MapPin, ShieldCheck, Sparkles,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo } from "react";
import { AppList, AppListRow, EmptyState, InsightPill, PageHeader, PriorityBanner, StatCard } from "@/components/admin/shared/AdminUI";

interface Props {
  business: Business;
  ordersCount: number;
  revenue: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  pendingOrders: number;
  recentOrders: any[];
  onNavigate?: (tab: string) => void;
}

const DashboardTab = ({ business, ordersCount, revenue, servicesCount, averageRating, reviewsCount, pendingOrders, recentOrders, onNavigate }: Props) => {
  const stats: Array<{ label: string; value: React.ReactNode; icon: React.ReactNode; tone: "emerald" | "blue" | "violet" | "amber"; hint?: string | null; emphasis?: "default" | "primary"; trend?: string | null }> = [
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: <DollarSign />, tone: "emerald", hint: ordersCount > 0 ? `${Math.round(revenue / Math.max(ordersCount, 1)).toLocaleString("da-DK")} kr pr. bestilling` : "Klar til at vokse med flere bookinger", emphasis: "primary", trend: ordersCount > 0 ? `${ordersCount} bookinger i alt` : null },
    { label: "Bestillinger", value: ordersCount, icon: <Handshake />, tone: "blue", hint: pendingOrders > 0 ? `${pendingOrders} kræver svar nu` : "Alt ser opdateret ud", trend: ordersCount > 0 ? "Seneste 30 dage" : null },
    { label: "Services", value: servicesCount, icon: <Briefcase />, tone: "violet", hint: servicesCount > 0 ? "Aktive ydelser på din profil" : "Tilføj din første service", trend: servicesCount > 0 ? "Klar til nye forespørgsler" : null },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: <Star />, tone: "amber", hint: reviewsCount > 0 ? `${reviewsCount} anmeldelser fra kunder` : "Ingen anmeldelser endnu", trend: reviewsCount > 0 ? "Din sociale proof" : null },
  ];

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
  const completionLead = missingItems[0]?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Virksomhedspanel"
        title="Overblik"
        description={<>Her er det vigtigste for <span className="font-medium text-foreground">{business.name}</span> lige nu — hvad kræver handling, hvordan går det, og hvad er næste skridt.</>}
        action={business.slug ? (
          <a href={`/biz/${business.slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground sm:flex">
            Se din side <ArrowRight className="h-3 w-3" />
          </a>
        ) : null}
      />

      <PriorityBanner
        eyebrow={pendingOrders > 0 ? "Kræver handling" : "Driftstatus"}
        icon={pendingOrders > 0 ? <Clock /> : <ShieldCheck />}
        title={pendingOrders > 0 ? `${pendingOrders} ${pendingOrders === 1 ? "afventende bestilling" : "afventende bestillinger"}` : "Ingen afventende bestillinger lige nu"}
        description={pendingOrders > 0 ? "Svar hurtigt på nye bestillinger for at holde flowet i gang og give kunderne en tydelig næste besked." : "Du er ajour lige nu. Brug tiden på at styrke din profil, dine services og de næste muligheder."}
        meta={
          <>
            <InsightPill><Handshake className="h-3.5 w-3.5" /> {ordersCount} bestillinger i alt</InsightPill>
            <InsightPill><TrendingUp className="h-3.5 w-3.5" /> {revenue.toLocaleString("da-DK")} kr omsætning</InsightPill>
            {servicesCount > 0 && <InsightPill><Briefcase className="h-3.5 w-3.5" /> {servicesCount} aktive services</InsightPill>}
          </>
        }
        action={
          <Button onClick={() => onNavigate?.(pendingOrders > 0 ? "orders" : "services")} className="h-10 rounded-xl px-4">
            {pendingOrders > 0 ? "Gå til aftaler" : "Udbyg dine services"}
          </Button>
        }
        secondaryAction={
          <button onClick={() => onNavigate?.(completeness.pct < 100 ? "settings" : "reviews")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {completeness.pct < 100 ? `Næste løft: ${completionLead || "fuldfør profilen"}` : "Se din kundefeedback"}
          </button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))]">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            hint={stat.hint}
            emphasis={stat.emphasis ?? (index === 0 ? "primary" : "default")}
            trend={stat.trend}
          />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        {completeness.pct < 100 && (
          <Card className="admin-panel border-border/80 shadow-sm">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Profilstyrke</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Gør profilen klar til flere bookinger</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Små forbedringer i profil, kontaktoplysninger og indhold giver kunderne mere tillid og gør din side mere komplet.</p>
                </div>
                <div className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">{completeness.pct}%</div>
              </div>
              <Progress value={completeness.pct} className="h-2.5" />
              <div className="grid gap-2 sm:grid-cols-2">
                {missingItems.slice(0, 4).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-feature-warm-foreground" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Næste anbefaling: <span className="font-medium text-foreground">{completionLead || "Fuldfør de sidste detaljer"}</span></p>
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => onNavigate?.("settings")}>
                  Fuldfør profil
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="admin-panel border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Næste handlinger</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Hold forretningen i bevægelse</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Tilføj service", icon: Briefcase, tab: "services" },
                { label: "Se bestillinger", icon: Handshake, tab: "orders" },
                { label: "Anmeldelser", icon: Star, tab: "reviews" },
                { label: "Indstillinger", icon: MapPin, tab: "settings" },
              ].map((action) => (
                <button
                  key={action.tab}
                  onClick={() => onNavigate?.(action.tab)}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3 text-left transition-colors hover:border-foreground/20 hover:bg-secondary/60"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <action.icon className="h-4 w-4" />
                    </span>
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
            <p className="text-sm text-muted-foreground">Scan hurtigt status, kunde og beløb — og gå direkte til aftaler ved behov.</p>
          </div>
          {recentOrders.length > 0 && (
            <button onClick={() => onNavigate?.("orders")} className="text-xs font-medium text-accent hover:underline">
              Se alle →
            </button>
          )}
        </div>
        {recentOrders.length > 0 ? (
          <AppList>
            <div className="grid grid-cols-[minmax(0,1.4fr)_auto] gap-3 border-b border-border/80 bg-secondary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-[minmax(0,1.4fr)_auto_auto]">
              <span>Kunde & aktivitet</span>
              <span className="hidden sm:block">Status</span>
              <span className="text-right">Beløb</span>
            </div>
            <div>
              {recentOrders.slice(0, 5).map((order) => (
                <AppListRow key={order.id} onClick={() => onNavigate?.("orders")} className="gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{order.customer_name}</p>
                      {order.status === "pending" && <Sparkles className="h-3.5 w-3.5 shrink-0 text-feature-warm-foreground" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className={`${statusColors[order.status] || ""} hidden border px-2.5 py-1 text-xs font-medium sm:inline-flex`}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                  <div className="flex min-w-[110px] flex-col items-end gap-1 text-right">
                    <span className="text-sm font-bold text-foreground tabular-nums">{order.total_amount} kr</span>
                    <span className="text-[11px] text-muted-foreground sm:hidden">{statusLabels[order.status] || order.status}</span>
                  </div>
                </AppListRow>
              ))}
            </div>
          </AppList>
        ) : (
          <EmptyState
            icon={<TrendingUp />}
            title="Ingen bestillinger endnu"
            description="Bestillinger vil vises her når de kommer ind."
          />
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
