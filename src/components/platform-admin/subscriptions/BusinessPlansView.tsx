import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, CreditCard, DollarSign, Download, Flame, TrendingUp } from "lucide-react";
import { exportCsv } from "../lib/csv";
import { StatCard, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { asArray, churnRiskScore, fmtKr, monthlyAmount } from "./shared";
import { PlanRow } from "./PlanRow";
import { PlanDetailDialog } from "./PlanDetailDialog";

export const BusinessPlansView = () => {
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
    const now = Date.now();
    return asArray<any>(data).reduce(
      (acc: any, p: any) => {
        acc.total += 1;
        if (p.status === "active") { acc.active += 1; acc.mrr += monthlyAmount(p); }
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

  // MRR-vandfald: ny / churn / netto for sidste 30 dage til regnskab.
  const handleExportMrrWaterfall = () => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const rows: any[] = [];
    let newMrr = 0, churnedMrr = 0, activeMrr = 0;
    asArray<any>(data).forEach((p: any) => {
      const m = monthlyAmount(p);
      if (p.status === "active") activeMrr += m;
      const created = new Date(p.created_at).getTime();
      if (p.status === "active" && created >= thirtyDaysAgo) {
        newMrr += m;
        rows.push({ type: "new", virksomhed: p.businesses?.name || "", dato: new Date(p.created_at).toLocaleDateString("da-DK"), mrr_dkk: Math.round(m) });
      }
      if ((p.status === "canceled" || p.status === "cancelled") && p.updated_at && new Date(p.updated_at).getTime() >= thirtyDaysAgo) {
        churnedMrr += m;
        rows.push({ type: "churn", virksomhed: p.businesses?.name || "", dato: new Date(p.updated_at).toLocaleDateString("da-DK"), mrr_dkk: -Math.round(m) });
      }
    });
    rows.push({ type: "TOTAL_AKTIV_MRR", virksomhed: "", dato: "", mrr_dkk: Math.round(activeMrr) });
    rows.push({ type: "NY_MRR_30D", virksomhed: "", dato: "", mrr_dkk: Math.round(newMrr) });
    rows.push({ type: "CHURN_MRR_30D", virksomhed: "", dato: "", mrr_dkk: -Math.round(churnedMrr) });
    rows.push({ type: "NETTO_30D", virksomhed: "", dato: "", mrr_dkk: Math.round(newMrr - churnedMrr) });
    exportCsv("mrr-vandfald-30d", rows);
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
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportMrrWaterfall} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> MRR-vandfald
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
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