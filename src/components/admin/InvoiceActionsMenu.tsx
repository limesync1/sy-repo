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
  Bell, Receipt, Ban, CheckCircle2, Loader2, ChevronDown, Gavel, MoreHorizontal,
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
  status?: string | null;
};

type Action = "send_reminder" | "credit_invoice" | "void_draft" | "mark_paid";
type ReminderType = "reminder1" | "reminder2" | "reminder3" | "collection" | "auto";

/**
 * Faktura-handlinger der kalder accounting-action edge function.
 * Vises kun for ordrer med en aktiv regnskabsintegration.
 */
export default function InvoiceActionsMenu({ order, compact = false }: { order: Order; compact?: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [reminderType, setReminderType] = useState<ReminderType>("auto");

  const isInvoiced = !!order.invoice_external_id;
  const isPaid = order.payment_status === "paid";
  const isCredited = order.payment_status === "credited";
  const isCancelled = order.status === "cancelled";
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
  // Find den primære (mest relevante) handling baseret på status.
  // Bruges af "compact"-varianten i kort-headers så vi viser ÉN tydelig CTA
  // + en overflow-menu til alt andet, i stedet for 4 knapper i en stribe.
  type PrimaryAction =
    | { kind: "reminder"; label: string; tone: "warning" | "danger"; icon: React.ReactNode; onClick: () => void }
    | { kind: "collection"; label: string; tone: "danger"; icon: React.ReactNode; onClick: () => void }
    | { kind: "mark_paid"; label: string; tone: "success"; icon: React.ReactNode; onClick: () => void }
    | { kind: "void"; label: string; tone: "neutral"; icon: React.ReactNode; onClick: () => void }
    | null;

  const primary: PrimaryAction = (() => {
    // Annullerede / betalte / krediterede ordrer kræver ingen yderligere handling.
    if (isCancelled || isPaid || isCredited) return null;
    if (isInvoiced && !isPaid && !isCredited) {
      if (allRemindersSent) {
        return { kind: "collection", label: "Send til inkasso", tone: "danger", icon: <Gavel className="h-3.5 w-3.5" />, onClick: () => sendReminder("collection") };
      }
      return {
        kind: "reminder",
        label: `Send ${reminderLabel}`,
        tone: isOverdue ? "danger" : "warning",
        icon: <Bell className="h-3.5 w-3.5" />,
        onClick: () => sendReminder(`reminder${nextReminderNumber}` as ReminderType),
      };
    }
    if (!isInvoiced) {
      return { kind: "void", label: "Annullér kladde", tone: "neutral", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => setConfirm("void_draft") };
    }
    return null;
  })();

  const toneCls = (tone: "warning" | "danger" | "success" | "neutral") => {
    switch (tone) {
      case "danger":  return "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive hover:border-destructive/50";
      case "warning": return "border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-300 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15 dark:hover:text-amber-100";
      case "success": return "border-success/40 bg-success/10 text-success hover:bg-success/15 hover:text-success hover:border-success/50";
      default:        return "border-border bg-card text-foreground hover:bg-secondary hover:text-foreground";
    }
  };

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
      const note = ((data as any)?.result?.note ?? (data as any)?.note) as string | undefined;
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

  // Kompakt variant — ÉT primær-CTA + overflow-menu med alt andet.
  // Bruges i header-rækken på aftale-kort så layoutet ikke cramper.
  if (compact) {
    // Ingen handlinger tilgængelige — skjul menuen helt for at holde headeren ren.
    const hasOverflowItems = (isInvoiced && !isPaid && !isCredited) || (isInvoiced && !isCredited) || !isInvoiced;
    if (!primary && !hasOverflowItems) return null;
    return (
      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {primary && (
          <Button
            variant="outline"
            size="sm"
            className={`h-7 px-2 text-[11px] font-medium leading-none transition-colors ${toneCls(primary.tone)}`}
            disabled={busy !== null}
            onClick={primary.onClick}
            aria-label={primary.label}
          >
            <Spinner
              a={
                primary.kind === "reminder" || primary.kind === "collection"
                  ? "send_reminder"
                  : primary.kind === "void"
                  ? "void_draft"
                  : "mark_paid"
              }
              fallback={primary.icon}
            />
            <span className="ml-1 hidden sm:inline">{primary.label}</span>
          </Button>
        )}

        <DropdownMenu>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground hover:border-foreground/20 data-[state=open]:bg-secondary data-[state=open]:text-foreground data-[state=open]:border-foreground/20"
                  disabled={busy !== null}
                  aria-label="Flere handlinger"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover border-border">Flere handlinger</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-60 bg-popover border-border shadow-xl rounded-lg p-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1"
          >
            {isInvoiced && !isPaid && !isCredited && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOverdue ? "bg-destructive" : "bg-amber-500"}`} />
                <span>
                  {sentCount}/3 rykkere{lastSent ? ` · sidst ${lastSent}` : ""}{isOverdue ? " · forfalden" : ""}
                </span>
              </div>
            )}

            {isInvoiced && !isPaid && !isCredited && !allRemindersSent && (
              <>
                {[1, 2, 3].map((n) => {
                  const key = `reminder${n}`;
                  const sent = sentTypes.has(key) || sentCount >= n;
                  const isNext = n === nextReminderNumber;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => !sent && sendReminder(key as ReminderType)}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer focus:bg-secondary focus:text-foreground data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed"
                      disabled={sent}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                        sent
                          ? "bg-success/10 text-success"
                          : isNext
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {sent
                          ? <CheckCircle2 className="h-3 w-3" />
                          : <Bell className="h-3 w-3" />}
                      </span>
                      <span className={`flex-1 text-[13px] leading-none ${sent ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {n}. rykker
                      </span>
                      {!sent && isNext && (
                        <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background">Næste</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
                {allRemindersSent ? null : null}
              </>
            )}

            {isInvoiced && !isPaid && !isCredited && allRemindersSent && (
              <DropdownMenuItem
                onSelect={() => sendReminder("collection")}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <Gavel className="h-3 w-3" />
                </span>
                <span className="flex-1 text-[13px] leading-none">Send til inkasso</span>
              </DropdownMenuItem>
            )}

            {((isInvoiced && !isPaid && !isCredited) || (isInvoiced && !isCredited) || !isInvoiced) && (
              <>
                <DropdownMenuSeparator className="my-1" />

                {isInvoiced && !isPaid && !isCredited && (
                  <DropdownMenuItem
                    onSelect={() => setConfirm("mark_paid")}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer focus:bg-success/10 focus:text-success"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                    <span className="flex-1 text-[13px] leading-none">Markér som betalt</span>
                  </DropdownMenuItem>
                )}

                {isInvoiced && !isCredited && (
                  <DropdownMenuItem
                    onSelect={() => setConfirm("credit_invoice")}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <Receipt className="h-3 w-3" />
                    </span>
                    <span className="flex-1 text-[13px] leading-none">Krediter faktura</span>
                  </DropdownMenuItem>
                )}

                {!isInvoiced && (
                  <DropdownMenuItem
                    onSelect={() => setConfirm("void_draft")}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <Ban className="h-3 w-3" />
                    </span>
                    <span className="flex-1 text-[13px] leading-none">Annullér kladde</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Genbrug bekræftelses-dialog fra fuld variant */}
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
                {confirm === "send_reminder" && "Rykkeren sendes via dit regnskabsprogram med dets standardlayout og evt. gebyr."}
                {confirm === "credit_invoice" && "Der oprettes en kreditnota i dit regnskabsprogram for hele fakturaens beløb. Dette kan ikke fortrydes."}
                {confirm === "void_draft" && "Kladden slettes i dit regnskabsprogram, og ordren markeres som annulleret."}
                {confirm === "mark_paid" && `Fakturaen registreres som betalt med ${order.total_amount ?? 0} kr. i dit regnskabsprogram.`}
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

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Send rykker — split-knap. Skjules når alle rykkere er sendt */}
      {isInvoiced && !isPaid && !isCredited && !allRemindersSent && (
        <div className="inline-flex rounded-md shadow-sm">
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={`h-8 rounded-r-none border-r-0 px-2.5 text-xs font-medium ${
                  isOverdue
                    ? "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
                    : "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
                }`}
                disabled={busy !== null}
                onClick={() => sendReminder(`reminder${nextReminderNumber}` as ReminderType)}
              >
                <Spinner a="send_reminder" fallback={<Bell className="h-3.5 w-3.5" />} />
                <span className="ml-1.5">Send {reminderLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] bg-popover border-border">
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
                    ? "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
                    : "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
                }`}
                disabled={busy !== null}
                aria-label="Flere rykker-typer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-popover border-border shadow-lg">
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
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-8 px-2.5 text-xs font-medium border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
              disabled={busy !== null}
              onClick={() => sendReminder("collection")}
            >
              <Spinner a="send_reminder" fallback={<Gavel className="h-3.5 w-3.5" />} />
              <span className="ml-1.5">Send til inkasso</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Alle 3 rykkere er sendt — næste skridt er inkasso</TooltipContent>
        </Tooltip>
      )}

      {/* Markér som betalt */}
      {isInvoiced && !isPaid && !isCredited && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-8 px-2.5 text-xs font-medium border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success"
              disabled={busy !== null}
              onClick={() => setConfirm("mark_paid")}
            >
              <Spinner a="mark_paid" fallback={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <span className="ml-1.5">Markér betalt</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Bogfør betaling i regnskabsprogrammet</TooltipContent>
        </Tooltip>
      )}

      {/* Krediter faktura */}
      {isInvoiced && !isCredited && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40"
              disabled={busy !== null}
              onClick={() => setConfirm("credit_invoice")}
              aria-label="Krediter faktura"
            >
              <Spinner a="credit_invoice" fallback={<Receipt className="h-3.5 w-3.5" />} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Opret kreditnota for hele fakturaen</TooltipContent>
        </Tooltip>
      )}

      {/* Annullér kladde */}
      {!isInvoiced && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40"
              disabled={busy !== null}
              onClick={() => setConfirm("void_draft")}
              aria-label="Annullér kladde"
            >
              <Spinner a="void_draft" fallback={<Ban className="h-3.5 w-3.5" />} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Slet faktura-kladden</TooltipContent>
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