import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CancelOrderDialog({ order, onClose, onCancel }: {
  order: { id: string; payment_status?: string | null } | null;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const { data: caps, isPending, isError, refetch } = useQuery({
    queryKey: ["cancel-order-caps", order?.id, order?.payment_status],
    enabled: !!order && order.payment_status !== "credited",
    retry: false,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("accounting-action", { body: { order_id: order?.id, action: "check_capabilities" } });
      if (error) throw error;
      if (data?.error || !data?.caps) throw new Error(data?.error || "Kunne ikke kontrollere fakturaen");
      return data.caps as { can_credit: boolean; exists_in_provider: boolean };
    },
  });
  const credited = order?.payment_status === "credited";
  const loading = !!order && !credited && isPending;
  const canCredit = !credited && !!caps?.can_credit;
  const blocked = !credited && (isError || (!!caps?.exists_in_provider && !canCredit));

  async function cancel(withCredit: boolean) {
    if (!order || busy) return;
    setBusy(true);
    try {
      if (withCredit) {
        const { data, error } = await supabase.functions.invoke("accounting-action", { body: { order_id: order.id, action: "credit_invoice" } });
        if (error) throw error;
        if (data?.error || data?.ok !== true) throw new Error(data?.error || "Kreditnotaen kunne ikke oprettes");
        if (data?.note) toast.warning(data.note);
      }
      await onCancel(order.id);
      onClose();
    } catch {
      toast.error(withCredit ? "Annulleringen blev ikke gennemført. Kontrollér kreditnotaens status og prøv igen." : "Aftalen kunne ikke annulleres. Prøv igen.");
    } finally { setBusy(false); }
  }

  return <Dialog open={!!order} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="appointment-details-overlay">
      <DialogHeader>
        <DialogTitle>Annullér aftale?</DialogTitle>
        <DialogDescription>{canCredit ? "Skal der oprettes en kreditnota for hele fakturaen? Kreditnotaen oprettes i regnskabsprogrammet, og kunden får en mail. Vælger du uden kreditnota, skal kontoret håndtere den senere." : credited ? "Fakturaen er allerede krediteret. Der oprettes ikke en ny kreditnota." : "Aftalen og dens tilknyttede abonnementer annulleres."}</DialogDescription>
      </DialogHeader>
      {loading && <div role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Kontrollerer fakturaen…</div>}
      {blocked && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Fakturaens mulighed for kreditering kunne ikke bekræftes. Prøv igen, eller kontrollér fakturaen i regnskabsprogrammet.</p><Button variant="outline" onClick={() => void refetch()}>Prøv igen</Button></div>}
      <div className="flex flex-col gap-2">
        {canCredit && <Button variant="destructive" className="min-h-11 h-auto whitespace-normal" disabled={busy || loading} onClick={() => void cancel(true)}><Receipt className="h-4 w-4" />Opret kreditnota og annullér</Button>}
        <Button variant="outline" className="min-h-11 h-auto whitespace-normal" disabled={busy || loading || blocked} onClick={() => void cancel(false)}><XCircle className="h-4 w-4" />{canCredit ? "Annullér uden kreditnota — kontoret håndterer den" : "Annullér aftale"}</Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Fortryd</Button>
        {busy && <Loader2 aria-label="Annullerer" className="h-5 w-5 animate-spin self-center" />}
      </div>
    </DialogContent>
  </Dialog>;
}