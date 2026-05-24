import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Ban, CheckCircle2, Loader2, MoreHorizontal, Download } from "lucide-react";

type Order = {
  id: string;
  payment_status?: string | null;
  invoice_external_id?: string | null;
  total_amount?: number | null;
  accounting_synced_at?: string | null;
  status?: string | null;
};

type Action = "credit_invoice" | "void_draft" | "mark_paid";

/**
 * Faktura-handlinger der kalder accounting-action edge function.
 * Rykker-håndtering ligger udelukkende i regnskabsprogrammet (auto-rykker /
 * rykkerkørsel) — Serviceydere viser kun status, ikke manuelle rykker-knapper.
 */
export default function InvoiceActionsMenu({ order, compact = false }: { order: Order; compact?: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);

  const isInvoiced = !!order.invoice_external_id;
  const isPaid = order.payment_status === "paid";
  const isCredited = order.payment_status === "credited";
  const isCancelled = order.status === "cancelled";

  // Probe regnskabsudbyderen for hvilke handlinger der faktisk kan udføres.
  // Hvis fakturaen ikke findes (slettet/ikke pushet) returneres alle false
  // og knapperne skjules — så brugeren aldrig kan trykke på noget der fejler.
  const { data: capsData } = useQuery({
    queryKey: ["invoice-caps", order.id, order.invoice_external_id, order.payment_status, order.status],
    enabled: !isCancelled && !isCredited,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("accounting-action", {
          body: { order_id: order.id, action: "check_capabilities" },
        });
        if (error) return null;
        return (data as any)?.caps ?? null;
      } catch { return null; }
    },
  });
  const caps = capsData as null | {
    can_credit: boolean; can_void: boolean; can_mark_paid: boolean;
    can_download_pdf?: boolean;
    is_booked: boolean; is_draft: boolean; exists_in_provider: boolean;
  };
  // Indtil vi har caps: vis intet for at undgå "knap der fejler".
  // Lokal status skal også gate'e — så betalte / krediterede / annullerede
  // ordrer aldrig viser handlingsknapper, selv hvis probe returnerer noget andet.
  const canCredit = !!caps?.can_credit && !isCredited && !isCancelled;
  const canVoid = !!caps?.can_void && !isCancelled && !isInvoiced;
  const canMarkPaid = !!caps?.can_mark_paid && !isPaid && !isCredited && !isCancelled;
  // Download-knappen vises KUN hvis der faktisk er en regnskabsintegration
  // tilkoblet (caps?.exists_in_provider) OG udbyderens adapter kan levere
  // en PDF. Uden integration er der ingen faktura at downloade.
  const canDownloadPdf = !!caps?.exists_in_provider && !!caps?.can_download_pdf;
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-action", {
        body: { order_id: order.id, action: "download_invoice" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const { pdf_base64, filename } = data as { pdf_base64: string; filename: string };
      const bin = atob(pdf_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? "faktura.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunne ikke hente PDF");
    } finally {
      setDownloading(false);
    }
  }

  type PrimaryAction =
    | { kind: Action; label: string; tone: "danger" | "success" | "neutral"; icon: React.ReactNode; onClick: () => void }
    | null;

  // Vælg den mest meningsfulde primære handling baseret på fakturaens tilstand:
  //   - Bogført + ubetalt → "Markér betalt" (success — positiv bekræftelse)
  //   - Kladde            → "Annullér kladde" (neutral — let destruktiv på hover)
  //   - Bogført + betalt  → "Krediter" (danger — reverserer bogført faktura)
  const primary: PrimaryAction = (() => {
    if (isCancelled || isCredited) return null;
    if (canMarkPaid) {
      return { kind: "mark_paid", label: "Markér som betalt", tone: "success", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => setConfirm("mark_paid") };
    }
    if (canVoid) {
      return { kind: "void_draft", label: "Annullér kladde", tone: "neutral", icon: <Ban className="h-3.5 w-3.5" />, onClick: () => setConfirm("void_draft") };
    }
    if (canCredit && isPaid) {
      return { kind: "credit_invoice", label: "Opret kreditnota", tone: "danger", icon: <Receipt className="h-3.5 w-3.5" />, onClick: () => setConfirm("credit_invoice") };
    }
    return null;
  })();

  // Solide hover-tilstande sikrer altid læsbar tekst — ingen "tekst forsvinder
  // i baggrunden" når man holder musen over knappen.
  const toneCls = (tone: "danger" | "success" | "neutral") => {
    switch (tone) {
      case "danger":
        return "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive";
      case "success":
        return "border-success/40 bg-success/10 text-success hover:bg-success hover:text-success-foreground hover:border-success";
      default:
        return "border-border bg-card text-foreground hover:bg-foreground hover:text-background hover:border-foreground";
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

  const Spinner = ({ a, fallback }: { a: Action; fallback: React.ReactNode }) =>
    busy === a ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{fallback}</>;

  // Overflow viser kun handlinger der IKKE allerede er primær — så samme knap
  // ikke optræder to gange.
  const primaryKind = primary?.kind ?? null;
  const showCreditInOverflow = canCredit && primaryKind !== "credit_invoice";
  const showVoidInOverflow   = canVoid   && primaryKind !== "void_draft";
  const showMarkPaidInOverflow = canMarkPaid && primaryKind !== "mark_paid";
  const hasOverflowItems = showCreditInOverflow || showVoidInOverflow || showMarkPaidInOverflow || canDownloadPdf;

  if (compact) {
    if (!primary && !hasOverflowItems && !canDownloadPdf) return null;
    return (
      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {canDownloadPdf && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 border-border bg-card text-muted-foreground transition-colors hover:bg-foreground hover:text-background hover:border-foreground"
            disabled={downloading}
            onClick={downloadPdf}
            aria-label="Download faktura-PDF"
            title="Download faktura-PDF"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        )}
        {primary && (
          <Button
            variant="outline"
            size="sm"
            className={`h-7 px-2 text-[11px] font-medium leading-none transition-colors ${toneCls(primary.tone)}`}
            disabled={busy !== null}
            onClick={primary.onClick}
            aria-label={primary.label}
          >
            <Spinner a={primary.kind} fallback={primary.icon} />
            <span className="ml-1 hidden sm:inline">{primary.label}</span>
          </Button>
        )}

        {hasOverflowItems && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground hover:border-foreground/20"
                disabled={busy !== null}
                aria-label="Flere handlinger"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60 bg-popover border-border shadow-xl rounded-lg p-1">
              {showMarkPaidInOverflow && (
                <DropdownMenuItem onSelect={() => setConfirm("mark_paid")} className="gap-2 cursor-pointer focus:bg-success focus:text-success-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Markér som betalt
                </DropdownMenuItem>
              )}
              {showCreditInOverflow && (
                <DropdownMenuItem onSelect={() => setConfirm("credit_invoice")} className="gap-2 cursor-pointer focus:bg-destructive focus:text-destructive-foreground">
                  <Receipt className="h-3.5 w-3.5" /> Krediter faktura
                </DropdownMenuItem>
              )}
              {showVoidInOverflow && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onSelect={() => setConfirm("void_draft")} className="gap-2 cursor-pointer focus:bg-foreground focus:text-background">
                    <Ban className="h-3.5 w-3.5" /> Annullér kladde
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ConfirmDialog confirm={confirm} setConfirm={setConfirm} run={run} totalAmount={order.total_amount ?? 0} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {canDownloadPdf && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 border border-border bg-card text-muted-foreground transition-colors hover:bg-foreground hover:text-background hover:border-foreground"
              disabled={downloading}
              onClick={downloadPdf}
              aria-label="Download faktura-PDF"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Download faktura som PDF</TooltipContent>
        </Tooltip>
      )}

      {canMarkPaid && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="outline" size="sm"
              className="h-8 px-2.5 text-xs font-medium border-success/40 bg-success/10 text-success transition-colors hover:bg-success hover:text-success-foreground hover:border-success"
              disabled={busy !== null}
              onClick={() => setConfirm("mark_paid")}
            >
              <Spinner a="mark_paid" fallback={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <span className="ml-1.5">Markér som betalt</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">Bogfør betaling i regnskabsprogrammet</TooltipContent>
        </Tooltip>
      )}

      {canCredit && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 border border-destructive/40 bg-destructive/5 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
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

      {canVoid && (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 border border-border bg-card text-muted-foreground transition-colors hover:bg-foreground hover:text-background hover:border-foreground"
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

      <ConfirmDialog confirm={confirm} setConfirm={setConfirm} run={run} totalAmount={order.total_amount ?? 0} />
    </div>
  );
}

function ConfirmDialog({
  confirm, setConfirm, run, totalAmount,
}: {
  confirm: Action | null;
  setConfirm: (a: Action | null) => void;
  run: (a: Action, params?: Record<string, unknown>) => void;
  totalAmount: number;
}) {
  return (
    <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirm === "credit_invoice" && "Krediter faktura?"}
            {confirm === "void_draft" && "Annullér kladde?"}
            {confirm === "mark_paid" && "Markér som betalt?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === "credit_invoice" && "Der oprettes en kreditnota i dit regnskabsprogram for hele fakturaens beløb. Dette kan ikke fortrydes."}
            {confirm === "void_draft" && "Kladden slettes i dit regnskabsprogram, og ordren markeres som annulleret."}
            {confirm === "mark_paid" && `Fakturaen registreres som betalt med ${totalAmount} kr. i dit regnskabsprogram.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Fortryd</AlertDialogCancel>
          <AlertDialogAction onClick={() => confirm && run(confirm)}>Fortsæt</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
