import { DollarSign, ShoppingCart, Building2, Users, TrendingUp, Star } from "lucide-react";
import { StatCard } from "@/components/admin/shared/AdminUI";
import { KpiCard } from "./Cards";
import { fmt, fmtKr, trendPct, type OverviewSnapshot } from "./shared";

interface Props { snapshot: OverviewSnapshot }

/** KPI-række + sekundære statistikker (MRR, genkøb, bedste ugedag, anmeldelser). */
export const OverviewKpis = ({ snapshot }: Props) => {
  const { kpis, prev, period_counts, totals, series, dow, repeat } = snapshot;
  const sparkOrders = series.map((d) => ({ v: d.orders }));
  const sparkUsers = series.map((d) => ({ v: d.users }));
  const sparkGmv = series.map((d) => ({ v: d.gmv }));
  const sparkBiz = series.map((d) => ({ v: d.businesses }));

  const dayOfWeek = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const orderByDow = [0, 0, 0, 0, 0, 0, 0];
  dow.forEach((d) => { orderByDow[d.dow] = Number(d.count) || 0; });
  const bestDow = orderByDow.indexOf(Math.max(...orderByDow));
  const repeatRate = repeat.unique_customers ? (repeat.repeat_customers / repeat.unique_customers) * 100 : 0;

  return (
    <>
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
        <StatCard label="MRR (cyklisk)" value={fmtKr(Number(totals.mrr))} icon={<DollarSign />} tone="emerald"
          hint={`${totals.active_subs} aktive abonnementer`} />
        <StatCard label="Genkøbsrate" value={`${repeatRate.toFixed(0)}%`} icon={<Users />} tone="blue"
          hint={`${repeat.repeat_customers} af ${repeat.unique_customers} kunder`} />
        <StatCard label="Bedste ugedag" value={orderByDow[bestDow] > 0 ? dayOfWeek[bestDow] : "—"} icon={<TrendingUp />} tone="violet"
          hint={`${orderByDow[bestDow]} ordrer`} />
        <StatCard label="Anmeldelser" value={String(totals.reviews_total)} icon={<Star />} tone="amber"
          hint={totals.reviews_total ? `${Number(totals.reviews_avg).toFixed(1)} ★ snit` : "Ingen endnu"} />
      </div>
    </>
  );
};