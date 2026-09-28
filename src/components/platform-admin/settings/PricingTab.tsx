import { useState } from "react";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { Tag, Calculator, Sparkles } from "lucide-react";
import { NumField } from "./shared";

interface Props {
  s: any;
  set: (k: string, v: any) => void;
  errors: Record<string, string>;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

/**
 * Live pris-eksempel der matcher BusinessOnboarding 1:1.
 *
 * Basispris dækker panel + ruteplanlægning + bestillinger.
 * Regnskab og ekstra medarbejderlogins er tilvalg.
 * Startup-fee tillægges 1. faktura efter prøveperiode.
 */
const PriceExample = ({ s }: { s: any }) => {
  const base = Number(s.base_price_dkk) || 0;
  const acc = Number(s.price_accounting_integration_dkk) || 0;
  const emp = Number(s.price_per_employee_login_dkk) || 0;
  const startup = Number(s.startup_fee_dkk) || 0;
  const qDisc = Number(s.discount_quarterly_pct) || 0;
  const yDisc = Number(s.discount_yearly_pct) || 0;
  const trial = Number(s.trial_days) || 0;

  const [withAccounting, setWithAccounting] = useState(false);
  const [extraLogins, setExtraLogins] = useState(0);

  const monthlySubtotal = base + (withAccounting ? acc : 0) + extraLogins * emp;

  const scenarios = [
    { label: "Månedlig", months: 1, discountPct: 0 },
    { label: "Kvartalsvis", months: 3, discountPct: qDisc },
    { label: "Årlig", months: 12, discountPct: yDisc },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Konfigurér eksempel</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <input type="checkbox" checked={withAccounting} onChange={(e) => setWithAccounting(e.target.checked)} className="h-4 w-4" />
            <span className="flex-1">Regnskabsintegration</span>
            <span className="text-xs tabular-nums text-muted-foreground">+{fmt(acc)}/md</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="flex-1">Ekstra medarbejder-logins</span>
            <input type="number" min={0} max={20} value={extraLogins} onChange={(e) => setExtraLogins(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} className="h-7 w-16 rounded border border-border bg-background px-2 text-right text-sm tabular-nums" />
            <span className="text-xs tabular-nums text-muted-foreground">×{fmt(emp)}</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        {scenarios.map((sc) => {
          const monthly = monthlySubtotal * (1 - sc.discountPct / 100);
          const periodTotal = monthly * sc.months;
          const firstInvoice = periodTotal + startup;
          return (
            <div key={sc.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{sc.label}{sc.discountPct > 0 && <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">−{sc.discountPct}%</span>}</p>
                  <p className="text-[11px] text-muted-foreground">{fmt(monthly)} / md · betales hver {sc.months === 1 ? "måned" : sc.months === 3 ? "kvartal" : "år"}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-foreground">{fmt(periodTotal)}</p>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-border/50 pt-1.5">
                <p className="text-[11px] text-muted-foreground">1. faktura efter {trial} dages prøve <span className="text-muted-foreground/70">(inkl. opstart {fmt(startup)})</span></p>
                <p className="text-[12px] font-semibold tabular-nums text-foreground">{fmt(firstInvoice)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function PricingTab({ s, set, errors }: Props) {
  return (
    <>
      <SectionCard
        title="Pris-tabel (DKK pr. måned)"
        icon={<Tag />}
        description="Tallene her bruges direkte i onboarding (BusinessOnboarding) når en virksomhed vælger pakke og add-ons. Ændringer slår igennem med det samme — eksisterende abonnementer i Stripe ændres ikke automatisk."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Basispris / md" v={s.base_price_dkk} on={(v) => set("base_price_dkk", v)} hint="Dækker panel, ruteplanlægning og bestillinger" error={errors.base_price_dkk} />
          <NumField label="Regnskabsintegration / md" v={s.price_accounting_integration_dkk} on={(v) => set("price_accounting_integration_dkk", v)} hint="Add-on (Dinero / E-conomic)" error={errors.price_accounting_integration_dkk} />
          <NumField label="Per ekstra medarbejderlogin / md" v={s.price_per_employee_login_dkk} on={(v) => set("price_per_employee_login_dkk", v)} hint="Tillægges når kunden har flere logins end pakken inkluderer" error={errors.price_per_employee_login_dkk} />
          <NumField label="Opstartspris (engangsbeløb)" v={s.startup_fee_dkk} on={(v) => set("startup_fee_dkk", v)} hint="Tillægges 1. faktura efter prøve" error={errors.startup_fee_dkk} />
          <NumField label="Dataimport (engangsbeløb)" v={s.price_data_import_dkk} on={(v) => set("price_data_import_dkk", v)} hint="Manuel migrering af eksisterende data" error={errors.price_data_import_dkk} />
          <NumField label="Prøveperiode (dage)" v={s.trial_days} on={(v) => set("trial_days", v)} hint="Gratis dage før første opkrævning" error={errors.trial_days} />
          <NumField label="Kvartalsrabat (%)" v={s.discount_quarterly_pct} on={(v) => set("discount_quarterly_pct", v)} hint="Trækkes fra månedsprisen ved kvartalsbetaling" error={errors.discount_quarterly_pct} />
          <NumField label="Årsrabat (%)" v={s.discount_yearly_pct} on={(v) => set("discount_yearly_pct", v)} hint="Trækkes fra månedsprisen ved årlig betaling" error={errors.discount_yearly_pct} />
          <NumField label="Ruteplanlægning (legacy)" v={s.price_route_planning_dkk} on={(v) => set("price_route_planning_dkk", v)} hint="Ikke længere brugt — basispris inkluderer ruteplan" error={errors.price_route_planning_dkk} />
        </div>
      </SectionCard>

      <SectionCard
        title="Live pris-eksempel"
        icon={<Calculator />}
        description="Realtids-beregning der matcher onboarding-flowet præcist. Kryds add-ons af for at se hvad kunden ville se."
      >
        <PriceExample s={s} />
      </SectionCard>

      <SectionCard
        title="Sådan vises priserne"
        icon={<Sparkles />}
      >
        <ul className="ml-4 list-disc space-y-1 text-[13px] text-muted-foreground">
          <li><strong>Basispris</strong> vises altid som "inkluderet" — kunden ser den som første linje i prisberegneren.</li>
          <li><strong>Regnskabsintegration</strong> og <strong>ekstra logins</strong> tilføjes som checkboxes/spinner — totalen opdateres live.</li>
          <li><strong>Rabat</strong> beregnes på månedsprisen FØR den ganges med antal måneder (kvartal/år).</li>
          <li><strong>Opstart</strong> tillægges KUN 1. faktura efter prøven og opkræves derefter aldrig igen.</li>
          <li>Alle priser er ekskl. moms — Stripe påfører 25% dansk moms ved opkrævning.</li>
        </ul>
      </SectionCard>
    </>
  );
}