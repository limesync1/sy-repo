import { UserPlus, ShoppingCart, Repeat, ChevronRight } from "lucide-react";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { fmt, type OverviewSnapshot } from "./shared";
import { cn } from "@/lib/utils";

/**
 * Konverterings-funnel: nye brugere → ordrer → genkøb.
 * Hver trin viser absolut tal + konverterings-rate fra trinet før.
 */
export const OverviewFunnel = ({ snapshot }: { snapshot: OverviewSnapshot }) => {
  const newUsers = snapshot.period_counts.new_users;
  const orders = Number(snapshot.kpis.orders);
  const repeatCust = snapshot.repeat.repeat_customers;
  const uniqueCust = snapshot.repeat.unique_customers;

  const steps = [
    {
      icon: UserPlus,
      label: "Nye brugere",
      value: newUsers,
      tone: "violet",
      conv: null as number | null,
      convLabel: "i perioden",
    },
    {
      icon: ShoppingCart,
      label: "Ordrer afgivet",
      value: orders,
      tone: "blue",
      conv: newUsers > 0 ? (orders / newUsers) * 100 : null,
      convLabel: newUsers > 0 ? `${((orders / newUsers) * 100).toFixed(0)}% af nye brugere` : "—",
    },
    {
      icon: Repeat,
      label: "Genkøbskunder",
      value: repeatCust,
      tone: "emerald",
      conv: uniqueCust > 0 ? (repeatCust / uniqueCust) * 100 : null,
      convLabel: uniqueCust > 0 ? `${((repeatCust / uniqueCust) * 100).toFixed(0)}% af unikke kunder` : "—",
    },
  ];

  const max = Math.max(...steps.map((s) => s.value), 1);

  const dotClasses: Record<string, string> = {
    violet: "bg-violet-500/10 text-violet-700",
    blue: "bg-accent/10 text-accent",
    emerald: "bg-emerald-500/10 text-emerald-700",
  };
  const barClasses: Record<string, string> = {
    violet: "bg-violet-500",
    blue: "bg-accent",
    emerald: "bg-emerald-500",
  };

  return (
    <SectionCard
      title="Konverterings-funnel"
      icon={<ShoppingCart />}
      description="Fra signup til loyal kunde — find hvor brugerne falder fra"
    >
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const pct = (s.value / max) * 100;
          return (
            <li key={s.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", dotClasses[s.tone])}>
                <s.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">{s.convLabel}</p>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full transition-all", barClasses[s.tone])}
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <p className="shrink-0 text-right text-lg font-bold tabular-nums text-foreground">{fmt(s.value)}</p>
              {i < steps.length - 1 && (
                <span aria-hidden="true" className="col-start-1 row-start-2 mx-auto -my-1 flex h-3 items-center justify-center text-muted-foreground/40">
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
};

export default OverviewFunnel;