// DPAAcceptanceBanner — beder virksomhedens ejer om aktivt at acceptere
// databehandleraftalen. Accepten gemmes med version, bruger, tidspunkt, IP og
// enhed, så begge parter har dokumentation. Når den nyeste version er
// accepteret, vises i stedet en diskret kvittering med link til aftalen.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DPA_VERSION } from "@/data/subprocessors";

type Props = {
  businessId: string;
  /** Er den aktuelle bruger ejer af virksomheden? Kun ejeren kan acceptere. */
  isOwner: boolean;
};

const DPAAcceptanceBanner = ({ businessId, isOwner }: Props) => {
  const qc = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  const { data: acceptance, isLoading } = useQuery({
    queryKey: ["dpa-acceptance", businessId],
    enabled: !!businessId && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dpa_acceptances")
        .select("id, version, created_at, accepted_name, accepted_email")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_dpa", {
        p_business_id: businessId,
        p_version: DPA_VERSION,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Databehandleraftalen er accepteret");
      qc.invalidateQueries({ queryKey: ["dpa-acceptance", businessId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunne ikke gemme accepten"),
  });

  if (!isOwner || isLoading) return null;

  const isCurrent = acceptance?.version === DPA_VERSION;

  if (isCurrent) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
        <span>
          Databehandleraftalen (version {acceptance.version}) er accepteret
          {acceptance.created_at
            ? ` den ${new Date(acceptance.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}`
            : ""}
          {acceptance.accepted_name ? ` af ${acceptance.accepted_name}` : ""}.
        </span>
        <Link to="/databehandleraftale" className="font-medium text-foreground underline underline-offset-2">
          Se aftalen
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {acceptance ? "Opdateret databehandleraftale" : "Godkend databehandleraftalen"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            I er dataansvarlige for oplysningerne om jeres kunder og medarbejdere, og vi behandler dem
            på jeres vegne. GDPR kræver en skriftlig aftale mellem os — læs den igennem og godkend her.
            {acceptance ? " Aftalen er blevet opdateret, siden I sidst godkendte." : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link
              to="/databehandleraftale"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-2"
            >
              <FileCheck2 className="h-4 w-4" aria-hidden /> Læs databehandleraftalen
            </Link>
            <Link
              to="/underdatabehandlere"
              target="_blank"
              rel="noopener"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Se underdatabehandlere
            </Link>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--foreground))]"
            />
            <span>
              Jeg har læst databehandleraftalen (version {DPA_VERSION}) og indgår den på vegne af virksomheden.
            </span>
          </label>

          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={!confirmed || accept.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Godkend aftalen
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Vi gemmer tidspunkt, hvem der godkendte, IP-adresse og enhed som dokumentation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DPAAcceptanceBanner;
