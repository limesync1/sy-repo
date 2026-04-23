import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Handshake, DollarSign, Star, Briefcase, Clock, TrendingUp,
  ArrowRight, AlertCircle, MapPin, ShieldCheck, Sparkles, CircleCheckBig,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo } from "react";
import { ActionTile, EmptyState, InsightPill, PageHeader, PriorityBanner, SectionCard, StatCard } from "@/components/admin/shared/AdminUI";

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
    pending: "bg-feature-warm text-feature-warm-foreground border-transparent",
    confirmed: "bg-feature-cool text-feature-cool-foreground border-transparent",
    in_progress: "bg-feature-lilac text-feature-lilac-foreground border-transparent",
    completed: "bg-secondary text-foreground border-transparent",
    cancelled: "bg-secondary text-muted-foreground border-transparent",
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
  const completedItems = completeness.checks.filter(c => c.done).length;

  return (
    <div className="space-y-4.5">
      <PageHeader
        eyebrow="Virksomhedspanel"
        title="Overblik"
        description={<>Driftsstatus, nøgletal og næste skridt for <span className="font-medium text-foreground">{business.name}</span>.</>}
        action={business.slug ? (
          <a href={`/biz/${business.slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex">
            Se din side <ArrowRight className="h-3 w-3" />
          </a>
        ) : null}
      />

      <PriorityBanner
        eyebrow={pendingOrders > 0 ? "Kræver handling" : "Driftstatus"}
        icon={pendingOrders > 0 ? <Clock /> : <ShieldCheck />}
        title={pendingOrders > 0 ? `${pendingOrders} ${pendingOrders === 1 ? "afventende bestilling" : "afventende bestillinger"}` : "Ingen afventende bestillinger lige nu"}
        description={pendingOrders > 0 ? "Start med de afventende bestillinger, så kunderne hurtigt får en afklaring." : "Driften er ajour. Brug næste skridt på profil, services og synlighed."}
        meta={
          <>
            <InsightPill><Handshake className="h-3.5 w-3.5" /> {ordersCount} bestillinger i alt</InsightPill>
            <InsightPill><TrendingUp className="h-3.5 w-3.5" /> {revenue.toLocaleString("da-DK")} kr omsætning</InsightPill>
            {servicesCount > 0 && <InsightPill><Briefcase className="h-3.5 w-3.5" /> {servicesCount} aktive services</InsightPill>}
          </>
        }
        action={
          <Button onClick={() => onNavigate?.(pendingOrders > 0 ? "orders" : "services")} className="h-8 rounded-md px-3.5 text-sm shadow-sm">
            {pendingOrders > 0 ? "Gå til aftaler" : "Udbyg dine services"}
          </Button>
        }
        secondaryAction={
          <button onClick={() => onNavigate?.(completeness.pct < 100 ? "settings" : "reviews")} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {completeness.pct < 100 ? `Næste løft: ${completionLead || "fuldfør profilen"}` : "Se din kundefeedback"}
          </button>
        }
      />

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-2 lg:grid-cols-[1.05fr_0.95fr]">
        {completeness.pct < 100 && (
          <Card className="admin-panel border-border shadow-sm">
            <CardContent className="space-y-3 p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Profilstyrke</p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground">Fuldfør profilen</h3>
                  <p className="mt-1 text-xs leading-4.5 text-muted-foreground">Luk de vigtigste huller for at styrke tillid og konvertering.</p>
                </div>
                <div className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-foreground">{completeness.pct}%</div>
              </div>
              <Progress value={completeness.pct} className="h-2" />
              <div className="grid gap-2 sm:grid-cols-2">
                {missingItems.slice(0, 4).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-feature-warm-foreground" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <InsightPill><CircleCheckBig className="h-3.5 w-3.5" /> {completedItems} af {completeness.total} punkter på plads</InsightPill>
                {completionLead && <InsightPill><AlertCircle className="h-3.5 w-3.5" /> Næste skridt: {completionLead}</InsightPill>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Næste: <span className="font-medium text-foreground">{completionLead || "Fuldfør de sidste detaljer"}</span></p>
                <Button variant="outline" className="h-8 rounded-md text-sm" onClick={() => onNavigate?.("settings")}>
                  Fuldfør profil
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

          <Card className="admin-panel border-border shadow-sm">
          <CardContent className="space-y-3 p-3.5 sm:p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Næste handlinger</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">Fokus nu</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Se bestillinger", icon: Handshake, tab: "orders", description: pendingOrders > 0 ? `${pendingOrders} kræver svar nu` : "Få overblik over kommende og afsluttede aftaler", meta: pendingOrders > 0 ? "Høj prioritet" : "Drift" },
                { label: "Tilføj service", icon: Briefcase, tab: "services", description: servicesCount > 0 ? "Udbyg din profil med flere ydelser og prisopsætning" : "Kom i gang med din første service", meta: servicesCount > 0 ? `${servicesCount} aktive services` : "Forretning" },
                { label: "Anmeldelser", icon: Star, tab: "reviews", description: reviewsCount > 0 ? "Hold øje med feedback og styrk tilliden hos nye kunder" : "Skab social proof når de første anmeldelser kommer ind", meta: reviewsCount > 0 ? `${reviewsCount} anmeldelser` : "Synlighed" },
                { label: "Indstillinger", icon: MapPin, tab: "settings", description: "Opdater virksomhedsoplysninger, kontakt og visning på din side", meta: "Opsætning" },
              ].map((action) => (
                <ActionTile
                  key={action.tab}
                  onClick={() => onNavigate?.(action.tab)}
                  icon={<action.icon />}
                  title={action.label}
                  description={action.description}
                  meta={action.meta}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionCard
        title="Seneste bestillinger"
        description="Seneste aktivitet i en kompakt, tabulær visning."
        action={recentOrders.length > 0 ? (
          <button onClick={() => onNavigate?.("orders")} className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Se alle
          </button>
        ) : null}
      >
        {recentOrders.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader className="admin-list-header">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead className="text-right">Beløb</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.slice(0, 6).map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => onNavigate?.("orders")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{order.customer_name}</p>
                        {order.status === "pending" && <Sparkles className="h-3.5 w-3.5 shrink-0 text-feature-warm-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[order.status] || ""} border px-2 py-1 text-[10px] font-medium`}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{order.total_amount} kr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp />}
            title="Ingen bestillinger endnu"
            description="Bestillinger vises her, når de første bookinger kommer ind."
          />
        )}
      </SectionCard>
    </div>
  );
};

export default DashboardTab;
