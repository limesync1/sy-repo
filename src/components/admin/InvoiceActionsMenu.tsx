import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell, Receipt, Ban, CheckCircle2, Loader2, RefreshCw, ChevronDown,
} from "lucide-react";

type Order = {
  id: string;
  payment_status?: string | null;
  invoice_external_id?: string | null;
  reminder_count?: number | null;
  total_amount?: number | null;
};

type Action = "send_reminder" | "credit_invoice" | "void_draft" | "mark_paid" | "sync_now";
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
  const nextReminderNumber = Math.min((order.reminder_count ?? 0) + 1, 3);
  const reminderLabel = nextReminderNumber === 1
    ? "Send 1. rykker"
    : `Send ${nextReminderNumber}. rykker`;

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
        sync_now: "Synkroniseret med regnskabsprogram",
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

  const Spinner = (a: Action) => busy === a
    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
    : null;

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Synkronisér nu — altid synlig så brugeren kan tvinge friske data */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0"
            disabled={busy !== null}
            onClick={() => run("sync_now")}
            aria-label="Synkronisér med regnskabsprogram"
          >
            {Spinner("sync_now") ?? <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Synkronisér betalings- og rykkerstatus nu</TooltipContent>
      </Tooltip>

      {/* Send rykker — split-knap: hovedhandling = næste rykker, dropdown = vælg */}
      {isInvoiced && !isPaid && !isCredited && (
        <div className="inline-flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-7 rounded-r-none border-r-0 px-2 text-[11px]"
                disabled={busy !== null}
                onClick={() => sendReminder(`reminder${nextReminderNumber}` as ReminderType)}
              >
                {Spinner("send_reminder") ?? <Bell className="h-3.5 w-3.5" />}
                <span className="ml-1">{reminderLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Registrér rykker {nextReminderNumber} for denne faktura</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-7 rounded-l-none px-1.5"
                disabled={busy !== null}
                aria-label="Flere rykker-typer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Vælg rykker-type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Markér som betalt */}
      {isInvoiced && !isPaid && !isCredited && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              disabled={busy !== null}
              onClick={() => setConfirm("mark_paid")}
            >
              {Spinner("mark_paid") ?? <CheckCircle2 className="h-3.5 w-3.5" />}
              <span className="ml-1">Betalt</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Markér fakturaen som betalt i regnskabsprogrammet</TooltipContent>
        </Tooltip>
      )}

      {/* Krediter faktura */}
      {isInvoiced && !isCredited && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
              disabled={busy !== null}
              onClick={() => setConfirm("credit_invoice")}
            >
              {Spinner("credit_invoice") ?? <Receipt className="h-3.5 w-3.5" />}
              <span className="ml-1">Krediter</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Opret kreditnota for hele fakturabeløbet</TooltipContent>
        </Tooltip>
      )}

      {/* Annullér kladde — kun hvis ikke bogført endnu */}
      {!isInvoiced && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
              disabled={busy !== null}
              onClick={() => setConfirm("void_draft")}
            >
              {Spinner("void_draft") ?? <Ban className="h-3.5 w-3.5" />}
              <span className="ml-1">Annullér kladde</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Slet faktura-kladden i regnskabsprogrammet</TooltipContent>
        </Tooltip>
      )}

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
            <AlertDialogAction onClick={() => confirm && run(confirm as Action)}>
              Fortsæt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}