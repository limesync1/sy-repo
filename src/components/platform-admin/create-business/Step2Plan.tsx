import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BILLING_OPTIONS, FEATURES, Field, formatDkk } from "./shared";

export default function Step2Plan(p: any) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Funktioner</Label>
          <div className="mt-2 grid gap-2">
            {FEATURES.map(({ key, icon: Icon, title, free, description }) => {
              const active = p.features[key];
              return (
                <button key={key} type="button"
                  onClick={() => p.setFeatures({ ...p.features, [key]: !active })}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    active ? "border-foreground bg-secondary" : "border-border bg-card hover:border-foreground/30"
                  )}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-foreground text-background" : "bg-secondary text-foreground")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">{title}</p>
                      {free
                        ? <span className="text-xs text-emerald-700 font-medium">Gratis</span>
                        : <span className="text-xs font-semibold tabular-nums">+{p.pricing ? formatDkk(p.pricing.price_accounting_integration_dkk) : "—"} kr/md</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ekstra medarbejderlogins">
            <Input type="number" min={0} max={50} value={p.extraLogins}
              onChange={(e: any) => p.setExtraLogins(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} />
          </Field>
          <Field label="Prøveperiode (dage)">
            <Input type="number" min={0} max={365} value={p.trialDays}
              onChange={(e: any) => p.setTrialDays(Math.max(0, Math.min(365, Number(e.target.value) || 0)))} />
          </Field>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faktureringsperiode</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BILLING_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => p.setBilling(o.value)}
                className={cn(
                  "rounded-lg border p-2.5 text-xs font-medium transition-colors",
                  p.billing === o.value ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30"
                )}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar: live pris */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4 h-fit lg:sticky lg:top-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live pris</p>
        {p.breakdown ? (
          <>
            <div className="mt-3 space-y-1.5 text-sm">
              {p.breakdown.lines.map((l: any, i: number) => (
                <div key={i} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">{l.label}</span>
                  <span className="tabular-nums shrink-0">{formatDkk(l.amount)} kr</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pr. måned (før rabat)</span>
                <span className="tabular-nums">{formatDkk(p.breakdown.monthlySubtotal)} kr</span>
              </div>
              {p.breakdown.discountPct > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 mt-0.5">
                  <span>Rabat ({p.breakdown.discountPct}%)</span>
                  <span>−{formatDkk(p.breakdown.monthlySubtotal - p.breakdown.monthlyAfterDiscount)} kr</span>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold">Pr. måned</span>
                <span className="text-lg font-bold tabular-nums">{formatDkk(p.breakdown.monthlyAfterDiscount)} kr</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">Indlæser priser…</p>
        )}
      </div>
    </div>
  );
}
