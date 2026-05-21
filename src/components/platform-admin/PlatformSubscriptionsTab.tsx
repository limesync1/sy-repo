import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, Download, DollarSign, PauseCircle, XCircle, Calendar, AlertCircle, CreditCard, Clock, TrendingUp, AlertTriangle, Flame, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { exportCsv } from "./lib/csv";
import { PageHeader, StatCard, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { INTERVAL_LABELS } from "@/types/service";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short" }) : "—";
const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("da-DK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Defensiv: cache-deling mellem faner har historisk leveret en Map
// her — så vi sikrer altid en array før .filter/.reduce.
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Churn-risk-score 0–100 baseret på betalingsfejl, past_due-status,
 * kort tid til fornyelse uden aktivitet, og cancel_at_period_end.
 * Bruges til at fremhæve planer der trænger til support-opfølgning.
 */
const churnRiskScore = (p: any): number => {
  let score = 0;
  if (p.status === "past_due") score += 50;
  if (p.last_payment_failed_at) score += 25;
  if (p.cancel_at_period_end) score += 30;
  if (p.status === "trialing" && p.trial_ends_at) {
    const daysLeft = (new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000;
    if (daysLeft <= 3) score += 20;
  }
  if (p.status === "unpaid") score += 60;
  return Math.min(100, score);
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const planStatusColor: Record<string, string> = {
  trialing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  past_due: "bg-red-500/10 text-red-700 border-red-500/20",
  canceled: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  cancelled: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  incomplete: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  unpaid: "bg-red-500/10 text-red-700 border-red-500/20",
};

const PlatformSubscriptionsTab = () => {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Abonnementer"
        description="Platform-planer (SaaS) og tilbagevendende kunde-services."
      />
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Platform-planer</TabsTrigger>
          <TabsTrigger value="customer">Kunde-abonnementer</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-4"><BusinessPlansView /></TabsContent>
        <TabsContent value="customer" className="space-y-4"><CustomerSubscriptionsView /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ============ Platform-planer (SaaS — business_plans) ============ */
const BusinessPlansView = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [detail, setDetail] = useState<any | null>(null);
  const [riskOnly, setRiskOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-business-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_plans")
        .select("*, businesses(id, name, slug, owner_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return asArray<any>(data).filter((p: any) => {
      if (status !== "all" && p.status !== status) return false;
      if (riskOnly && churnRiskScore(p) < 30) return false;
      if (!q.trim()) return true;
      const ql = q.toLowerCase();
      return p.businesses?.name?.toLowerCase().includes(ql) || p.stripe_customer_id?.toLowerCase().includes(ql);
    });
  }, [data, q, status, riskOnly]);

  const stats = useMemo(() => {
    const monthly = (p: any) => p.billing_period === "yearly"
      ? Number(p.monthly_price_dkk || 0) / 12
      : Number(p.monthly_price_dkk || 0);
    const now = Date.now();
    return asArray<any>(data).reduce(
      (acc: any, p: any) => {
        acc.total += 1;
        if (p.status === "active") { acc.active += 1; acc.mrr += monthly(p); }
        if (p.status === "trialing") {
          acc.trialing += 1;
          if (p.trial_ends_at && new Date(p.trial_ends_at).getTime() - now < 3 * 86400000) acc.trialEndingSoon += 1;
        }
        if (p.status === "past_due") acc.pastDue += 1;
        if (p.status === "canceled" || p.status === "cancelled") acc.cancelled += 1;
        if (p.cancel_at_period_end) acc.cancelingAtPeriodEnd += 1;
        if (churnRiskScore(p) >= 30) acc.atRisk += 1;
        return acc;
      },
      { total: 0, active: 0, trialing: 0, trialEndingSoon: 0, pastDue: 0, cancelled: 0, mrr: 0, cancelingAtPeriodEnd: 0, atRisk: 0 }
    );
  }, [data]);

  const handleExport = () => {
    exportCsv("platform-planer", filtered.map((p: any) => ({
      virksomhed: p.businesses?.name || "",
      status: p.status,
      interval: p.billing_period,
      pris_md: p.monthly_price_dkk,
      trial_slutter: p.trial_ends_at ? new Date(p.trial_ends_at).toLocaleDateString("da-DK") : "",
      naeste_fornyelse: p.current_period_end ? new Date(p.current_period_end).toLocaleDateString("da-DK") : "",
      sidste_betaling: p.last_payment_at ? new Date(p.last_payment_at).toLocaleDateString("da-DK") : "",
      stop_ved_fornyelse: p.cancel_at_period_end,
      miljø: p.stripe_environment,
      churn_risk: churnRiskScore(p),
    })));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="MRR" value={fmtKr(stats.mrr)} icon={<DollarSign />} tone="emerald"
          hint={`${fmtKr(stats.mrr * 12)}/år`} />
        <StatCard label="Aktive" value={String(stats.active)} icon={<TrendingUp />} tone="emerald" />
        <StatCard label="Trial" value={String(stats.trialing)} icon={<Clock />} tone="blue"
          hint={stats.trialEndingSoon > 0 ? `${stats.trialEndingSoon} udløber <3d` : undefined} />
        <StatCard label="Past due" value={String(stats.pastDue)} icon={<AlertTriangle />} tone="amber"
          hint={stats.pastDue > 0 ? "Kræver opfølgning" : "Ingen"} />
        <button
          onClick={() => setRiskOnly((v) => !v)}
          className="text-left focus:outline-none rounded-lg"
          aria-pressed={riskOnly}
          aria-label={`Vis kun risiko-planer (${stats.atRisk})`}
        >
          <StatCard
            label="Churn-risiko"
            value={String(stats.atRisk)}
            icon={<Flame />}
            tone={stats.atRisk > 0 ? "amber" : "neutral"}
            hint={riskOnly ? "Filter aktivt — klik for at fjerne" : "Klik for at filtrere"}
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg virksomhed eller stripe-id..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="canceled">Opsagt</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5 ml-auto">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CreditCard />} title="Ingen planer fundet" description="Justér filtre eller søgning." />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((p: any) => (
              <PlanRow key={p.id} p={p} onOpen={() => setDetail(p)} />
            ))}
          </div>
        </Card>
      )}

      <PlanDetailDialog plan={detail} onClose={() => setDetail(null)} />
    </div>
  );
};

const PlanRow = ({ p, onOpen }: { p: any; onOpen: () => void }) => {
  const now = Date.now();
  const trialDays = p.trial_ends_at ? Math.ceil((new Date(p.trial_ends_at).getTime() - now) / 86400000) : null;
  const monthly = p.billing_period === "yearly"
    ? Number(p.monthly_price_dkk || 0) / 12
    : Number(p.monthly_price_dkk || 0);
  const risk = churnRiskScore(p);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40",
        risk >= 50 && "bg-destructive/[0.03]",
      )}
    >
      <div className={cn(
        "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
        risk >= 50 ? "bg-destructive/10" : "bg-foreground/5",
      )}>
        <CreditCard className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {p.businesses?.name || "—"}
          {p.stripe_environment === "sandbox" && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">sandbox</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{p.billing_period === "yearly" ? "Årlig" : "Månedlig"} · {fmtKr(p.monthly_price_dkk)}{p.billing_period === "yearly" ? "/år" : "/md"}</span>
          {p.current_period_end && (<><span>·</span><span>Fornyer {fmtDate(p.current_period_end)}</span></>)}
          {p.status === "trialing" && trialDays !== null && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
              trialDays <= 3 ? "bg-red-500/10 text-red-700" : "bg-blue-500/10 text-blue-700"
            }`}>
              <Clock className="h-2.5 w-2.5" /> Trial: {trialDays}d
            </span>
          )}
          {p.cancel_at_period_end && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              <XCircle className="h-2.5 w-2.5" /> Stopper {fmtDate(p.current_period_end)}
            </span>
          )}
          {p.last_payment_failed_at && p.status === "past_due" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="h-2.5 w-2.5" /> Fejlet {fmtDate(p.last_payment_failed_at)}
            </span>
          )}
          {risk >= 30 && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              risk >= 60 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700",
            )}>
              <Flame className="h-2.5 w-2.5" /> Risk {risk}
            </span>
          )}
        </div>
      </div>
      <Badge className={`${planStatusColor[p.status] || "bg-slate-500/10 text-slate-700 border-slate-500/20"} border text-xs`}>
        {p.status}
      </Badge>
      <span className="text-sm font-bold tabular-nums w-24 text-right">{fmtKr(Math.round(monthly))}/md</span>
    </button>
  );
};

/**
 * Side-detalje for en business-plan. Viser alle Stripe-felter samlet,
 * direkte link til virksomhed/profil, og hurtighandlinger.
 */
const PlanDetailDialog = ({ plan, onClose }: { plan: any | null; onClose: () => void }) => {
  if (!plan) return null;
  const risk = churnRiskScore(plan);
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plan.businesses?.name || "Plan"}
            <Badge className={`${planStatusColor[plan.status] || ""} border text-[10px]`}>{plan.status}</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Plan oprettet {fmtDateTime(plan.created_at)} · {plan.stripe_environment}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/40 p-3">
            <Field label="Plan-pris">{fmtKr(plan.monthly_price_dkk)} {plan.billing_period === "yearly" ? "/år" : "/md"}</Field>
            <Field label="Næste fornyelse">{fmtDate(plan.current_period_end)}</Field>
            <Field label="Trial slutter">{fmtDate(plan.trial_ends_at)}</Field>
            <Field label="Sidste betaling">{fmtDate(plan.last_payment_at)}</Field>
            <Field label="Stripe customer">
              <span className="font-mono text-[11px] break-all">{plan.stripe_customer_id || "—"}</span>
            </Field>
            <Field label="Stripe subscription">
              <span className="font-mono text-[11px] break-all">{plan.stripe_subscription_id || "—"}</span>
            </Field>
            {plan.stripe_payment_method_last4 && (
              <Field label="Kort">
                {plan.stripe_payment_method_brand} •••• {plan.stripe_payment_method_last4}
              </Field>
            )}
            <Field label="Churn-risk">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                risk >= 60 ? "bg-destructive/10 text-destructive" :
                risk >= 30 ? "bg-amber-500/10 text-amber-700" :
                "bg-emerald-500/10 text-emerald-700",
              )}>
                <Flame className="h-2.5 w-2.5" /> {risk}/100
              </span>
            </Field>
          </dl>

          <div className="flex flex-wrap gap-2">
            {plan.businesses?.slug && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/${plan.businesses.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Åbn profil
                </Link>
              </Button>
            )}
            {plan.stripe_customer_id && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a
                  href={`https://dashboard.stripe.com/${plan.stripe_environment === "sandbox" ? "test/" : ""}customers/${plan.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Åbn i Stripe
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="truncate text-foreground">{children}</dd>
  </div>
);

/* ============ Kunde-abonnementer (eksisterende — recurring services) ============ */
const CustomerSubscriptionsView = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, businesses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return asArray<any>(data).filter((s: any) => {
      if (status !== "all" && s.status !== status) return false;
      if (!q.trim()) return true;
      const ql = q.toLowerCase();
      return s.service_name?.toLowerCase().includes(ql) || s.businesses?.name?.toLowerCase().includes(ql);
    });
  }, [data, q, status]);

  const stats = asArray<any>(data).reduce(
    (acc: any, s: any) => {
      acc.total += 1;
      if (s.status === "active") { acc.active += 1; acc.mrr += Number(s.total_price || 0); }
      if (s.status === "paused") acc.paused += 1;
      if (s.status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { total: 0, active: 0, paused: 0, cancelled: 0, mrr: 0 }
  );

  // Hjælp admin med at se hvad der kræver opmærksomhed denne uge.
  const upcomingCount = asArray<any>(data).filter((s: any) => {
    if (s.status !== "active" || !s.next_service_date) return false;
    const days = (new Date(s.next_service_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;
  const arr = stats.mrr * 12;
  const churnRate = stats.total ? (stats.cancelled / stats.total) * 100 : 0;

  const handleExport = () => {
    exportCsv("abonnementer", filtered.map((s: any) => ({
      service: s.service_name, virksomhed: s.businesses?.name || "",
      interval: s.interval, status: s.status, pris: s.total_price,
      naeste_service: s.next_service_date ? new Date(s.next_service_date).toLocaleDateString("da-DK") : "",
      oprettet: new Date(s.created_at).toLocaleDateString("da-DK"),
    })));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aktive" value={String(stats.active)} icon={<DollarSign />} tone="emerald"
          hint={`${fmtKr(stats.mrr)}/md · ${fmtKr(arr)}/år`} />
        <StatCard label="Service inden for 7 dage" value={String(upcomingCount)} icon={<Calendar />} tone="blue"
          hint={upcomingCount > 0 ? "Kræver planlægning" : "Ingen lige nu"} />
        <StatCard label="Pauset" value={String(stats.paused)} icon={<PauseCircle />} tone="amber"
          hint={stats.paused > 0 ? "Genoptag eller opsig" : undefined} />
        <StatCard label="Opsigelsesrate" value={`${churnRate.toFixed(0)}%`} icon={<XCircle />} tone="neutral"
          hint={`${stats.cancelled} af ${stats.total} samlet`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg service, virksomhed..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="paused">Pauset</SelectItem>
            <SelectItem value="cancelled">Opsagt</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5 ml-auto">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Repeat />}
          title="Ingen abonnementer fundet"
          description="Justér søgning eller status-filter."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((s: any) => (
              <SubscriptionRow key={s.id} s={s} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

/* SubscriptionRow — enkel række med visuel "snart"-pille når næste
   service er inden for 7 dage. Gør det nemt at spotte hvad der kræver
   handling uden at læse datoen. */
const SubscriptionRow = ({ s }: { s: any }) => {
  const next = s.next_service_date ? new Date(s.next_service_date) : null;
  const daysToNext = next ? (next.getTime() - Date.now()) / 86400000 : null;
  const upcoming = s.status === "active" && daysToNext !== null && daysToNext >= 0 && daysToNext <= 7;
  const overdue = s.status === "active" && daysToNext !== null && daysToNext < 0;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Repeat className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.service_name} <span className="text-muted-foreground">→ {s.businesses?.name || "—"}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{INTERVAL_LABELS[s.interval] || s.interval}</span>
                    <span>·</span>
                    <span>Næste: {next ? next.toLocaleDateString("da-DK") : "—"}</span>
                    {overdue && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" /> Overskredet
                      </span>
                    )}
                    {upcoming && !overdue && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Calendar className="h-2.5 w-2.5" /> Om {Math.ceil(daysToNext!)} dag{Math.ceil(daysToNext!) === 1 ? "" : "e"}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`${statusColor[s.status] || ""} border text-xs`}>{s.status}</Badge>
                <span className="text-sm font-bold tabular-nums w-24 text-right">{fmtKr(s.total_price)}</span>
    </div>
  );
};

export default PlatformSubscriptionsTab;
