import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Stat } from "../lib/Stat";

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface Props {
  business: any;
  plan: any;
  daysLeft: number | null;
  businessId: string;
  onInvalidate: () => void;
}

export default function OverviewPanel({ business, plan, daysLeft, businessId, onInvalidate }: Props) {
  return (
    <div className="space-y-3 mt-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Status</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Oprettet" value={fmtDate(business?.created_at)} />
          <Stat label="Plan-status" value={plan?.status || "—"} />
          <Stat label="Verificeret" value={business?.is_verified ? "Ja" : "Nej"} />
          <Stat label="Aktiv" value={business?.is_active ? "Ja" : "Nej"} />
          <Stat label="Prøve slutter" value={fmtDate(plan?.trial_ends_at)} />
          <Stat label="Dage tilbage" value={daysLeft !== null ? `${daysLeft}` : "—"} />
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Status-handlinger</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline"
            onClick={async () => {
              const { error } = await supabase.from("businesses").update({ is_verified: !business?.is_verified }).eq("id", businessId);
              if (error) toast.error(error.message); else { toast.success("Opdateret"); onInvalidate(); }
            }}>
            {business?.is_verified ? <><XCircle className="h-3.5 w-3.5 mr-1.5" />Fjern verifikation</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Verificér</>}
          </Button>
          <Button size="sm" variant="outline"
            onClick={async () => {
              const { error } = await supabase.from("businesses").update({ is_active: !business?.is_active }).eq("id", businessId);
              if (error) toast.error(error.message); else { toast.success("Opdateret"); onInvalidate(); }
            }}>
            {business?.is_active ? "Deaktivér" : "Aktivér"}
          </Button>
        </div>
      </Card>
    </div>
  );
}