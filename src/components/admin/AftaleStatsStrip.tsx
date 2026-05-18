import { useMemo } from "react";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval,
} from "date-fns";
import { da } from "date-fns/locale";

/**
 * AftaleStatsStrip — kompakt strip øverst på Aftaler-fanen, der viser
 * "planlagt omsætning" for denne uge og denne måned. Matcher det højrepanel
 * mange konkurrenter har, men holdt vandret så det glider ind i layoutet.
 */
type OrderLike = {
  id: string;
  status: string;
  total_amount: number | null;
  preferred_date?: string | null;
  created_at?: string;
};

const fmtKr = (n: number) =>
  `${Math.round(n).toLocaleString("da-DK")} kr`;

const useScheduled = (orders: OrderLike[]) =>
  useMemo(() => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 1, locale: da });
    const wEnd = endOfWeek(now, { weekStartsOn: 1, locale: da });
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    let weekRevenue = 0, monthRevenue = 0, weekCount = 0, monthCount = 0;
    for (const o of orders) {
      if (["cancelled", "rejected"].includes(o.status)) continue;
      const dateStr = o.preferred_date || o.created_at;
      if (!dateStr) continue;
      let d: Date;
      try { d = parseISO(dateStr.slice(0, 10)); } catch { continue; }
      const amt = Number(o.total_amount) || 0;
      if (isWithinInterval(d, { start: wStart, end: wEnd })) {
        weekRevenue += amt; weekCount += 1;
      }
      if (isWithinInterval(d, { start: mStart, end: mEnd })) {
        monthRevenue += amt; monthCount += 1;
      }
    }
    return { weekRevenue, monthRevenue, weekCount, monthCount };
  }, [orders]);

export const AftaleStatsStrip = ({ orders }: { orders: OrderLike[] }) => {
  const s = useScheduled(orders);
  if (s.weekCount === 0 && s.monthCount === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <StatChip
        icon={<Calendar className="h-4 w-4" />}
        label="Planlagt denne uge"
        value={fmtKr(s.weekRevenue)}
        sub={`${s.weekCount} ${s.weekCount === 1 ? "aftale" : "aftaler"}`}
      />
      <StatChip
        icon={<TrendingUp className="h-4 w-4" />}
        label="Planlagt denne måned"
        value={fmtKr(s.monthRevenue)}
        sub={`${s.monthCount} ${s.monthCount === 1 ? "aftale" : "aftaler"}`}
      />
      <StatChip
        icon={<DollarSign className="h-4 w-4" />}
        label="Snit pr. aftale (måned)"
        value={s.monthCount ? fmtKr(s.monthRevenue / s.monthCount) : "—"}
        sub="Ekskl. annullerede"
      />
    </div>
  );
};

const StatChip = ({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

export default AftaleStatsStrip;
