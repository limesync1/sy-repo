// PlanPanel — prøveperiode, betalingsinformation og ejer-overdragelse.
// Udskilt fra BusinessDetailSheet i Trin 26.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarClock, CreditCard, RefreshCw, ShieldCheck, UserCog, Zap } from "lucide-react";
import { Stat } from "../lib/Stat";
import { useAdminMutation } from "../lib/useAdminMutation";

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface Props {
  businessId: string;
  plan: any;
  ownerEmail?: string | null;
  daysLeft: number | null;
  onInvalidate: () => void;
}

export default function PlanPanel({ businessId, plan, ownerEmail, daysLeft, onInvalidate }: Props) {
  const [extendDays, setExtendDays] = useState("14");
  const [forceNote, setForceNote] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const hasCard = !!plan?.stripe_payment_method_last4;

  const rpcMut = useAdminMutation<{ msg: string }, { fn: string; args: any; successMsg: string }>({
    mutationFn: async ({ fn, args, successMsg }) => {
      const { error } = await supabase.rpc(fn as any, args);
      if (error) throw new Error(error.message);
      return { msg: successMsg };
    },
    successMessage: (_d, vars) => vars.successMsg,
    onDone: onInvalidate,
  });

  return (
    <div className="space-y-3 mt-4">
      {/* Trial */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4" />Prøveperiode</h3>
        <div className="text-xs text-muted-foreground">
          Slutter: <span className="font-medium text-foreground">{fmtDate(plan?.trial_ends_at)}</span>
          {daysLeft !== null && <> · {daysLeft} dage tilbage</>}
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30].map((d) => (
            <Button key={d} size="sm" variant="outline"
              onClick={() => rpcMut.mutate({ fn: "admin_extend_trial", args: { p_business_id: businessId, p_days: d }, successMsg: `Prøveperiode forlænget med ${d} dage` })}>
              +{d} dage
            </Button>
          ))}
          <div className="flex gap-1.5 items-center">
            <Input className="h-9 w-20" type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
            <Button size="sm" variant="outline"
              onClick={() => {
                const d = parseInt(extendDays, 10);
                if (isNaN(d)) return toast.error("Ugyldigt tal");
                rpcMut.mutate({ fn: "admin_extend_trial", args: { p_business_id: businessId, p_days: d }, successMsg: `Forlænget med ${d} dage` });
              }}>Forlæng</Button>
          </div>
          <Button size="sm" variant="outline"
            onClick={() => rpcMut.mutate({ fn: "admin_reset_trial", args: { p_business_id: businessId, p_days: 14 }, successMsg: "Prøveperiode nulstillet til 14 dage" })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Nulstil (14d)
          </Button>
          <Button size="sm" variant="outline" className="text-amber-700 hover:text-amber-800"
            onClick={() => {
              if (!confirm("Afslut prøveperioden NU? Virksomheden vil straks blive bedt om at tilføje kort.")) return;
              rpcMut.mutate({ fn: "admin_end_trial_now", args: { p_business_id: businessId }, successMsg: "Prøveperiode afsluttet" });
            }}>
            <Zap className="h-3.5 w-3.5 mr-1.5" />Afslut nu
          </Button>
        </div>
      </Card>

      {/* Betaling */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Betaling</h3>
        <div className="text-sm">
          {hasCard ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CreditCard className="h-3.5 w-3.5" />
              {plan?.stripe_payment_method_brand || "Kort"} •••• {plan?.stripe_payment_method_last4}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Intet kort på fil</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Månedspris" value={fmtKr(Number(plan?.monthly_price_dkk) || 0)} />
          <Stat label="Periode" value={plan?.billing_period || "—"} />
          <Stat label="Rute-planlægning" value={plan?.route_planning_enabled ? "Ja" : "Nej"} />
          <Stat label="Regnskab" value={plan?.accounting_integration_enabled ? "Ja" : "Nej"} />
          <Stat label="Ekstra logins" value={`${plan?.extra_employee_logins || 0}`} />
          <Stat label="Stripe sub" value={plan?.stripe_subscription_id ? "Aktiv" : "—"} />
        </div>
        <Textarea
          placeholder="Note (fx 'kulance — kunde havde tekniske problemer')"
          className="text-xs min-h-[60px]"
          value={forceNote}
          onChange={(e) => setForceNote(e.target.value)}
        />
        <Button size="sm" variant="outline" className="w-full"
          onClick={() => {
            if (!confirm("Markér virksomheden som BETALENDE manuelt (uden Stripe-kort)?")) return;
            rpcMut.mutate({ fn: "admin_force_active", args: { p_business_id: businessId, p_note: forceNote || null }, successMsg: "Virksomhed markeret som aktiv" });
          }}>
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Markér som betalende (kulance)
        </Button>
        {hasCard && (
          <Button size="sm" variant="outline" className="w-full text-amber-700"
            onClick={async () => {
              if (!confirm("Fjern det gemte kort fra Lovable-databasen? Stripe-abonnementet annulleres IKKE automatisk.")) return;
              const { error } = await supabase.from("business_plans").update({
                stripe_payment_method_last4: null,
                stripe_payment_method_brand: null,
                status: 'trialing',
              }).eq("business_id", businessId);
              if (error) toast.error(error.message); else { toast.success("Kort fjernet"); onInvalidate(); }
            }}>
            Fjern gemt kort
          </Button>
        )}
      </Card>

      {/* Ejer */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><UserCog className="h-4 w-4" />Ejer</h3>
        <div className="text-xs text-muted-foreground">
          Nuværende: <span className="font-medium text-foreground">{ownerEmail || "—"}</span>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Overdrag til (e-mail på eksisterende bruger)</Label>
          <div className="flex gap-2">
            <Input type="email" placeholder="ny.ejer@eksempel.dk" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className="h-9" />
            <Button size="sm" variant="outline"
              disabled={!transferEmail.includes("@")}
              onClick={() => {
                if (!confirm(`Overdrag til ${transferEmail}?`)) return;
                rpcMut.mutate({
                  fn: "admin_transfer_business_owner",
                  args: { p_business_id: businessId, p_new_owner_email: transferEmail },
                  successMsg: "Ejer opdateret",
                });
                setTransferEmail("");
              }}>Overdrag</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
