import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake, DollarSign, Star, Briefcase, TrendingUp,
  ArrowRight, AlertCircle, MapPin, ChevronRight,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo } from "react";
import { PageHeader, StatCard, EmptyState } from "@/components/admin/shared/AdminUI";

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
  const stats: Array<{ label: string; value: React.ReactNode; icon: React.ReactNode; tone: "emerald" | "blue" | "violet" | "amber"; hint?: string | null }> = [
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: <DollarSign />, tone: "emerald", hint: null },
    { label: "Bestillinger", value: ordersCount, icon: <Handshake />, tone: "blue", hint: null },
    { label: "Services", value: servicesCount, icon: <Briefcase />, tone: "violet", hint: null },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: <Star />, tone: "amber", hint: reviewsCount > 0 ? `${reviewsCount} anmeldelser` : null },
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
  const recentPending = recentOrders.filter((order) => order.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={business.name}
        description={<>Her er status for <span className="font-medium text-foreground">{business.name}</span>.</>}
        action={business.slug ? (
          <a href={`/v/${business.slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Se din side <ArrowRight className="h-3 w-3" />
          </a>
        ) : null}
      />

      {pendingOrders > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kræver opmærksomhed</p>
              <p className="mt-1 text-base font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "bestilling" : "bestillinger"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Nye aftaler ligger klar til gennemgang.</p>
            </div>
            <Button className="h-9 rounded-lg px-4 text-sm sm:shrink-0" onClick={() => onNavigate?.("orders")}>
              Gå til aftaler
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                tone={stat.tone}
                hint={stat.hint}
              />
            ))}
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
                  { label: "Se bestillinger", meta: `${recentPending} afventer svar`, icon: Handshake, tab: "orders" },
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

export default DashboardTab;
