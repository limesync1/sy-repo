import { SectionCard } from "@/components/admin/shared/AdminUI";
import { Tag, Calculator } from "lucide-react";
import { NumField } from "./shared";

interface Props {
  s: any;
  set: (k: string, v: any) => void;
  errors: Record<string, string>;
}

const PriceExample = ({ s }: { s: any }) => {
  const base = Number(s.base_price_dkk) || 0;
  const route = Number(s.price_route_planning_dkk) || 0;
  const acc = Number(s.price_accounting_integration_dkk) || 0;
  const emp = Number(s.price_per_employee_login_dkk) || 0;
  const qDisc = Number(s.discount_quarterly_pct) || 0;
  const yDisc = Number(s.discount_yearly_pct) || 0;
  const monthly = base + route + acc + 2 * emp;
  const fmt = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
  const rows = [
    { label: "Månedligt", price: monthly, suffix: "/md", note: "Basis + ruteplan + regnskab + 2 ekstra logins" },
    { label: "Kvartalsvist", price: monthly * (1 - qDisc / 100), suffix: "/md", note: `${qDisc}% rabat` },
    { label: "Årligt", price: monthly * (1 - yDisc / 100), suffix: "/md", note: `${yDisc}% rabat` },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{r.label}</p>
            <p className="text-[11px] text-muted-foreground">{r.note}</p>
          </div>
          <p className="text-sm font-bold tabular-nums text-foreground">{fmt(r.price)}<span className="text-xs font-normal text-muted-foreground">{r.suffix}</span></p>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Eksemplet er beregnet ud fra din nuværende pris-tabel. Prøveperiode på {Number(s.trial_days) || 0} dage før første opkrævning.</p>
    </div>
  );
};

export default function PricingTab({ s, set, errors }: Props) {
  return (
    <>
      <SectionCard
        title="Pris-tabel (DKK pr. måned)"
        icon={<Tag />}
        description="Tallene her bruges direkte i onboarding når en virksomhed vælger pakke og add-ons."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Basispris" v={s.base_price_dkk} on={(v) => set("base_price_dkk", v)} hint="Inkluderet i alle abonnementer" error={errors.base_price_dkk} />
          <NumField label="Ruteplanlægning" v={s.price_route_planning_dkk} on={(v) => set("price_route_planning_dkk", v)} hint="Add-on" error={errors.price_route_planning_dkk} />
          <NumField label="Regnskabsintegration" v={s.price_accounting_integration_dkk} on={(v) => set("price_accounting_integration_dkk", v)} hint="Gratis (sat til 0)" error={errors.price_accounting_integration_dkk} />
          <NumField label="Dataimport" v={s.price_data_import_dkk} on={(v) => set("price_data_import_dkk", v)} hint="Engangs / add-on" error={errors.price_data_import_dkk} />
          <NumField label="Per ekstra medarbejderlogin" v={s.price_per_employee_login_dkk} on={(v) => set("price_per_employee_login_dkk", v)} hint="Pris pr. ekstra login" error={errors.price_per_employee_login_dkk} />
          <NumField label="Opstartspris (engangsbeløb)" v={s.startup_fee_dkk} on={(v) => set("startup_fee_dkk", v)} hint="Tillægges 1. faktura efter prøve (standard 2.269 kr)" error={errors.startup_fee_dkk} />
          <NumField label="Prøveperiode (dage)" v={s.trial_days} on={(v) => set("trial_days", v)} hint="Gratis dage før første betaling" error={errors.trial_days} />
          <NumField label="Kvartalsrabat (%)" v={s.discount_quarterly_pct} on={(v) => set("discount_quarterly_pct", v)} hint="Ved kvartalsbetaling" error={errors.discount_quarterly_pct} />
          <NumField label="Årsrabat (%)" v={s.discount_yearly_pct} on={(v) => set("discount_yearly_pct", v)} hint="Ved årlig betaling" error={errors.discount_yearly_pct} />
        </div>
      </SectionCard>

      <SectionCard
        title="Live pris-eksempel"
        icon={<Calculator />}
        description="Sådan ser virksomheden prisen baseret på dine indstillinger ovenfor."
      >
        <PriceExample s={s} />
      </SectionCard>
    </>
  );
}