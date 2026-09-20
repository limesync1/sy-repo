import { SectionCard } from "@/components/admin/shared/AdminUI";
import { KeyRound, AlertCircle, ShieldCheck } from "lucide-react";
import { Field, detectStripeMode } from "./shared";

interface Props {
  s: any;
  set: (k: string, v: any) => void;
  errors: Record<string, string>;
}

export default function PaymentTab({ s, set, errors }: Props) {
  const pubMode = detectStripeMode(s.stripe_publishable_key || "", "pk");

  return (
    <SectionCard
      title="Stripe API-nøgler"
      icon={<KeyRound />}
      description="Bruges til at opkræve betaling for virksomhedsabonnementer. Kun den offentlige nøgle gemmes her."
    >
      <Field
        label="Publishable key (pk_live_… / pk_test_…)"
        v={s.stripe_publishable_key || ""}
        on={(v) => set("stripe_publishable_key", v)}
        badge={pubMode}
        error={errors.stripe_publishable_key}
      />

      <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2.5 text-[12px] text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Secret key og webhook secret
        </p>
        <p>
          Stripe secret key (<code>sk_…</code>) og webhook signing secret (<code>whsec_…</code>) gemmes
          <strong> ikke i databasen</strong>. De opbevares som server-hemmeligheder og er kun tilgængelige for
          backend-funktionerne. Kontakt en udvikler for at opdatere dem.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2.5 text-[12px] text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Andre integrationer</p>
        <p>
          AI, mails, betaling og CVR-opslag administreres via <strong>Connectors</strong> i sidemenuen —
          nøglerne ligger sikkert på serveren og behøver ikke indtastes her.
        </p>
      </div>

      {pubMode?.mode === "Test" ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Test-nøgle aktiv — rigtige betalinger opkræves ikke.
        </p>
      ) : null}
    </SectionCard>
  );
}
