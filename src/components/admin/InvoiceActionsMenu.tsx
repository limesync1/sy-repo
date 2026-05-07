import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Mail, Receipt, Ban, CheckCircle2, Loader2 } from "lucide-react";

type Order = {
  id: string;
  payment_status?: string | null;
  invoice_external_id?: string | null;
  reminder_count?: number | null;
  total_amount?: number | null;
  /** "economic" | "billy" | "dinero" | "zenegy" — bruges til hint-tekst. */
  accounting_provider?: string | null;
};

type Action = "send_reminder" | "credit_invoice" | "void_draft" | "mark_paid";
type ReminderType = "reminder1" | "reminder2" | "reminder3" | "collection" | "auto";

/**
 * Faktura-handlinger der kalder accounting-action edge function.
 * Vises kun for ordrer med en aktiv regnskabsintegration.
 */
export default function InvoiceActionsMenu({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);

  const isInvoiced = !!order.invoice_external_id;
  const isPaid = order.payment_status === "paid";
  const isCredited = order.payment_status === "credited";
  const reminderLabel = (order.reminder_count ?? 0) > 0
    ? `Send rykker (${(order.reminder_count ?? 0) + 1})`
    : "Send 1. rykker";

  async function run(action: Action, params?: Record<string, unknown>) {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-action", {
        body: { order_id: order.id, action, params },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const labels: Record<Action, string> = {
        send_reminder: "Rykker registreret",
        credit_invoice: "Faktura krediteret",
        void_draft: "Kladde annulleret",
        mark_paid: "Faktura markeret som betalt",
      };
      const note = (data as any)?.result?.note as string | undefined;
      toast.success(labels[action], note ? { description: note } : undefined);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Handlingen mislykkedes");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  function sendReminder(type: ReminderType) {
    run("send_reminder", { type });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={(e) => e.stopPropagation()}
            disabled={busy !== null}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MoreHorizontal className="h-3 w-3" />}
            <span className="ml-1">Faktura</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Faktura-handlinger</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isInvoiced && !isPaid && !isCredited && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Mail className="mr-2 h-3.5 w-3.5" /> {reminderLabel}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => sendReminder("reminder1")}>1. rykker</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => sendReminder("reminder2")}>2. rykker</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => sendReminder("reminder3")}>3. rykker</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => sendReminder("collection")}
                    className="text-destructive focus:text-destructive"
                  >
                    Send til inkasso
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          {isInvoiced && !isPaid && !isCredited && (
            <DropdownMenuItem onSelect={() => setConfirm("mark_paid")}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Markér som betalt
            </DropdownMenuItem>
          )}
          {isInvoiced && !isCredited && (
            <DropdownMenuItem
              onSelect={() => setConfirm("credit_invoice")}
              className="text-destructive focus:text-destructive"
            >
              <Receipt className="mr-2 h-3.5 w-3.5" /> Krediter faktura
            </DropdownMenuItem>
          )}
          {!isInvoiced && (
            <DropdownMenuItem
              onSelect={() => setConfirm("void_draft")}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="mr-2 h-3.5 w-3.5" /> Annullér kladde
            </DropdownMenuItem>
          )}
          {!isInvoiced && isPaid && (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              Ingen handlinger tilgængelige
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "send_reminder" && reminderLabel}
              {confirm === "credit_invoice" && "Krediter faktura?"}
              {confirm === "void_draft" && "Annullér kladde?"}
              {confirm === "mark_paid" && "Markér som betalt?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "send_reminder" &&
                "Rykkeren sendes via dit regnskabsprogram med dets standardlayout og evt. gebyr."}
              {confirm === "credit_invoice" &&
                "Der oprettes en kreditnota i dit regnskabsprogram for hele fakturaens beløb. Dette kan ikke fortrydes."}
              {confirm === "void_draft" &&
                "Kladden slettes i dit regnskabsprogram, og ordren markeres som annulleret."}
              {confirm === "mark_paid" &&
                `Fakturaen registreres som betalt med ${order.total_amount ?? 0} kr. i dit regnskabsprogram.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortryd</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && run(confirm)}>
              Fortsæt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}