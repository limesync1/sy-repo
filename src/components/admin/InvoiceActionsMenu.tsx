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
  Bell, Receipt, Ban, CheckCircle2, Loader2, RefreshCw, ChevronDown, Gavel,
} from "lucide-react";

type Order = {
  id: string;
  payment_status?: string | null;
  invoice_external_id?: string | null;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  total_amount?: number | null;
  accounting_synced_at?: string | null;
  reminder_history?: unknown;
  due_date?: string | null;
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
  const [reminderType, setReminderType] = useState<ReminderType>("auto");

  const isInvoiced = !!order.invoice_external_id;
  const isPaid = order.payment_status === "paid";
  const isCredited = order.payment_status === "credited";
  const sentCount = order.reminder_count ?? 0;
  const nextReminderNumber = Math.min(sentCount + 1, 3);
  const allRemindersSent = sentCount >= 3;
  const reminderLabel = nextReminderNumber === 1
    ? "1. rykker"
    : `${nextReminderNumber}. rykker`;
  const sentTypes = (() => {
    const arr = Array.isArray(order.reminder_history) ? (order.reminder_history as any[]) : [];
    return new Set(arr.map((r) => r?.type).filter(Boolean));
  })();
  const isOverdue = order.due_date
    ? new Date(order.due_date).getTime() < Date.now() && !isPaid && !isCredited
    : false;
  const lastSent = order.last_reminder_at
    ? new Date(order.last_reminder_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
    : null;
  const syncedLabel = order.accounting_synced_at
    ? new Date(order.accounting_synced_at).toLocaleString("da-DK", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "ikke endnu";

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
    setReminderType(type);
    setConfirm("send_reminder");
  }

  const Spinner = ({ a, fallback }: { a: Action; fallback: React.ReactNode }) =>
    busy === a ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{fallback}</>;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Synkronisér nu */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
            disabled={busy !== null}
            onClick={() => run("sync_now")}
            aria-label="Synkronisér med regnskabsprogram"
          >
            <Spinner a="sync_now" fallback={<RefreshCw className="h-3.5 w-3.5" />} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">Hent friske data fra regnskabsprogrammet</div>
          <div className="text-[10px] opacity-70">Sidst synket: {syncedLabel}</div>
        </TooltipContent>
      </Tooltip>

      {/* Send rykker — split-knap. Skjules når alle rykkere er sendt */}
      {isInvoiced && !isPaid && !isCredited && !allRemindersSent && (
        <div className="inline-flex rounded-md shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={`h-8 rounded-r-none border-r-0 px-2.5 text-xs font-medium ${
                  isOverdue
                    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                }`}
                disabled={busy !== null}
                onClick={() => sendReminder(`reminder${nextReminderNumber}` as ReminderType)}
              >
                <Spinner a="send_reminder" fallback={<Bell className="h-3.5 w-3.5" />} />
                <span className="ml-1.5">Send {reminderLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              <div className="text-xs font-medium">Send {reminderLabel} via dit regnskabsprogram</div>
              {sentCount > 0 && (
                <div className="mt-1 text-[11px] opacity-80">
                  {sentCount} {sentCount === 1 ? "rykker" : "rykkere"} allerede sendt
                  {lastSent ? ` (sidst ${lastSent})` : ""}
                </div>
              )}
              {isOverdue && (
                <div className="mt-1 text-[11px] font-medium text-destructive">
                  Forfaldsdato er overskredet
                </div>
              )}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={`h-8 rounded-l-none px-1.5 ${
                  isOverdue
                    ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
                disabled={busy !== null}
                aria-label="Flere rykker-typer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Rykker-historik &amp; valg
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[1, 2, 3].map((n) => {
                const key = `reminder${n}`;
                const sent = sentTypes.has(key) || sentCount >= n;
                const isNext = n === nextReminderNumber;
                return (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => sendReminder(key as ReminderType)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      {sent ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Bell className={`h-3.5 w-3.5 ${n === 3 ? "text-orange-700" : n === 2 ? "text-amber-700" : "text-amber-600"}`} />
                      )}
                      <span className={sent ? "text-muted-foreground" : ""}>{n}. rykker</span>
                    </span>
                    {sent && (
                      <span className="text-[10px] font-medium text-success">Sendt</span>
                    )}
                    {!sent && isNext && (
                      <span className="text-[10px] font-semibold text-foreground">Næste</span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => sendReminder("collection")}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Gavel className="h-3.5 w-3.5" /> Send til inkasso
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Når alle 3 rykkere er sendt vis kun "Send til inkasso" */}
      {isInvoiced && !isPaid && !isCredited && allRemindersSent && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-8 px-2.5 text-xs font-medium border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              disabled={busy !== null}
              onClick={() => sendReminder("collection")}
            >
              <Spinner a="send_reminder" fallback={<Gavel className="h-3.5 w-3.5" />} />
              <span className="ml-1.5">Send til inkasso</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Alle 3 rykkere er sendt — næste skridt er inkasso</TooltipContent>
        </Tooltip>
      )}

      {/* Markér som betalt */}
      {isInvoiced && !isPaid && !isCredited && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-8 px-2.5 text-xs font-medium border-success/30 bg-success/5 text-success hover:bg-success/10 hover:text-success"
              disabled={busy !== null}
              onClick={() => setConfirm("mark_paid")}
            >
              <Spinner a="mark_paid" fallback={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <span className="ml-1.5">Markér betalt</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Bogfør betaling i regnskabsprogrammet</TooltipContent>
        </Tooltip>
      )}

      {/* Krediter faktura */}
      {isInvoiced && !isCredited && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={busy !== null}
              onClick={() => setConfirm("credit_invoice")}
              aria-label="Krediter faktura"
            >
              <Spinner a="credit_invoice" fallback={<Receipt className="h-3.5 w-3.5" />} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Opret kreditnota for hele fakturaen</TooltipContent>
        </Tooltip>
      )}

      {/* Annullér kladde */}
      {!isInvoiced && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={busy !== null}
              onClick={() => setConfirm("void_draft")}
              aria-label="Annullér kladde"
            >
              <Spinner a="void_draft" fallback={<Ban className="h-3.5 w-3.5" />} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Slet faktura-kladden</TooltipContent>
        </Tooltip>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "send_reminder" && (reminderType === "collection" ? "Send til inkasso?" : `Send ${reminderLabel}?`)}
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
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm === "send_reminder") run("send_reminder", { type: reminderType });
                else run(confirm as Action);
              }}
            >
              Fortsæt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}