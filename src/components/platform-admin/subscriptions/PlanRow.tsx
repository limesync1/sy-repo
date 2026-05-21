import { Badge } from "@/components/ui/badge";
import { CreditCard, Clock, XCircle, AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { churnRiskScore, fmtDate, fmtKr, monthlyAmount, planStatusColor } from "./shared";

export const PlanRow = ({ p, onOpen }: { p: any; onOpen: () => void }) => {
  const now = Date.now();
  const trialDays = p.trial_ends_at ? Math.ceil((new Date(p.trial_ends_at).getTime() - now) / 86400000) : null;
  const monthly = monthlyAmount(p);
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