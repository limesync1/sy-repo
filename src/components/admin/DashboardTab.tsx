import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Handshake, DollarSign, Star, Briefcase, Clock, TrendingUp,
  ArrowRight, AlertCircle, MapPin,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo } from "react";

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
  const stats = [
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", change: null },
    { label: "Bestillinger", value: ordersCount, icon: Handshake, color: "text-blue-600", bg: "bg-blue-500/10", ring: "ring-blue-500/20", change: null },
    { label: "Services", value: servicesCount, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-500/10", ring: "ring-violet-500/20", change: null },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: Star, color: "text-amber-600", bg: "bg-amber-500/10", ring: "ring-amber-500/20", change: reviewsCount > 0 ? `${reviewsCount} anmeldelser` : null },
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

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Velkommen tilbage 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">Her er et overblik over <span className="font-medium text-foreground">{business.name}</span>.</p>
        </div>
        {business.slug && (
          <a href={`/biz/${business.slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Se din side <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-xl border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <div className={`rounded-lg p-1.5 ${stat.bg} ring-1 ${stat.ring}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
              {stat.change && <p className="mt-0.5 text-xs text-muted-foreground">{stat.change}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts row */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Pending orders alert */}
        {pendingOrders > 0 && (
          <Card className="rounded-xl border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "bestilling" : "bestillinger"}</p>
                <p className="text-xs text-muted-foreground">Kræver din opmærksomhed</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 h-8 rounded-lg text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                onClick={() => onNavigate?.("orders")}>
                Se aftaler
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile completeness */}
        {completeness.pct < 100 && (
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Profilfuldendelse</p>
                <span className="text-xs font-bold text-accent tabular-nums">{completeness.pct}%</span>
              </div>
              <Progress value={completeness.pct} className="h-2 mb-3" />
              <div className="space-y-1">
                {missingItems.slice(0, 3).map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                    <span>{item.label} mangler</span>
                  </div>
                ))}
                {missingItems.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-5">+ {missingItems.length - 3} mere</p>
                )}
              </div>
              <Button size="sm" variant="outline" className="mt-3 h-7 rounded-lg text-xs w-full"
                onClick={() => onNavigate?.("settings")}>
                Fuldfør profil
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Tilføj service", icon: Briefcase, tab: "services", color: "text-violet-600", bg: "bg-violet-500/10" },
          { label: "Se bestillinger", icon: Handshake, tab: "orders", color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Anmeldelser", icon: Star, tab: "reviews", color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Indstillinger", icon: MapPin, tab: "settings", color: "text-emerald-600", bg: "bg-emerald-500/10" },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate?.(action.tab)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:shadow-sm hover:border-foreground/20">
            <div className={`rounded-lg p-2 ${action.bg} transition-colors`}>
              <action.icon className={`h-4 w-4 ${action.color}`} />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
          {recentOrders.length > 0 && (
            <button onClick={() => onNavigate?.("orders")} className="text-xs font-medium text-accent hover:underline">
              Se alle →
            </button>
          )}
        </div>
        {recentOrders.length > 0 ? (
          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => onNavigate?.("orders")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <Badge className={`${statusColors[order.status] || ""} text-xs font-medium border px-2 py-0.5`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap w-16 text-right tabular-nums">{order.total_amount} kr</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="rounded-xl border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <TrendingUp className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen bestillinger endnu</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Bestillinger vil vises her når de kommer ind.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
