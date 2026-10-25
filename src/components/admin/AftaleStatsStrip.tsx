import { formatPrice } from "@/lib/price-format";
import { useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval,
} from "date-fns";
import { da } from "date-fns/locale";
import { StatCard } from "@/components/admin/shared/AdminUI";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";

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
  `${formatPrice(Math.round(n))}`;

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

  const avg = s.monthCount ? fmtKr(s.monthRevenue / s.monthCount) : "—";
  const mobileItems = [
    { label: "Denne uge", value: fmtKr(s.weekRevenue), hint: `${s.weekCount} ${s.weekCount === 1 ? "aftale" : "aftaler"}` },
    { label: "Denne måned", value: fmtKr(s.monthRevenue), hint: `${s.monthCount} ${s.monthCount === 1 ? "aftale" : "aftaler"}` },
    { label: "Snit pr. aftale", value: avg, hint: "denne måned" },
  ];

  return (
    <>
    {/* Mobil: ét kompakt kort med tre kolonner, så nøgletal ikke fylder hele skærmen. */}
    <div className="grid grid-cols-3 divide-x divide-border rounded-[5px] border border-border bg-card shadow-sm sm:hidden">
      {mobileItems.map((it) => (
        <div key={it.label} className="min-w-0 px-2 py-2.5 text-center">
          <p className="truncate text-[11px] font-medium text-muted-foreground">{it.label}</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-foreground">{it.value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{it.hint}</p>
        </div>
      ))}
    </div>
    <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={<BrandedIllustration name="calendarWeek" />}
        label="Planlagt denne uge"
        value={fmtKr(s.weekRevenue)}
        hint={`${s.weekCount} ${s.weekCount === 1 ? "aftale" : "aftaler"}`}
      />
      <StatCard
        icon={<BrandedIllustration name="calendarMonth" />}
        label="Planlagt denne måned"
        value={fmtKr(s.monthRevenue)}
        hint={`${s.monthCount} ${s.monthCount === 1 ? "aftale" : "aftaler"}`}
        tone="ok"
      />
      <StatCard
        icon={<BrandedIllustration name="averageOrder" />}
        label="Snit pr. aftale (måned)"
        value={s.monthCount ? fmtKr(s.monthRevenue / s.monthCount) : "—"}
        hint="Ekskl. annullerede"
      />
    </div>
  );
};

export default AftaleStatsStrip;
