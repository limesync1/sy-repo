import { useMemo } from "react";
import {
  Bell, CheckCircle2, FileText, Receipt, Ban, ShoppingCart,
  Play, Pencil, XCircle, Gavel, CreditCard, Clock, RefreshCw,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ReminderEntry = {
  sent_at?: string | null;
  type?: string | null;
  fee?: number | null;
  external_id?: string | null;
  note?: string | null;
};

type Order = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  invoiced_at?: string | null;
  paid_at?: string | null;
  credited_at?: string | null;
  voided_at?: string | null;
  due_date?: string | null;
  business_response?: string | null;
  customer_response?: string | null;
  reminder_history?: unknown;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  payment_status?: string | null;
  invoice_external_id?: string | null;
};

const REMINDER_LABEL: Record<string, string> = {
  reminder1: "1. rykker",
  reminder2: "2. rykker",
  reminder3: "3. rykker",
  collection: "Sendt til inkasso",
  auto: "Rykker",
};

const REMINDER_TONE: Record<string, string> = {
  reminder1: "border-amber-300 bg-amber-50 text-amber-800",
  reminder2: "border-orange-300 bg-orange-50 text-orange-800",
  reminder3: "border-orange-400 bg-orange-100 text-orange-900",
  collection: "border-destructive/40 bg-rose-50 text-destructive",
};

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("da-DK", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

const fmtRelative = (iso?: string | null) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "lige nu";
  if (mins < 60) return `${mins} min siden`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} t siden`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d siden`;
  const months = Math.round(days / 30);
  return `${months} mdr siden`;
};

type Event = {
  at: string;
  icon: typeof Bell;
  title: string;
  detail?: string;
  toneCls: string;
  iconCls: string;
};

export default function OrderTimeline({ order }: { order: Order }) {
  const events: Event[] = useMemo(() => {
    const out: Event[] = [];
    if (order.created_at) {
      out.push({
        at: order.created_at, icon: ShoppingCart, title: "Bestilling modtaget",
        toneCls: "border-border bg-background", iconCls: "text-muted-foreground",
      });
    }
    if (order.business_response === "accepted") {
      out.push({
        at: order.created_at || new Date().toISOString(), icon: CheckCircle2,
        title: "Aftale godkendt", toneCls: "border-blue-200 bg-blue-50",
        iconCls: "text-blue-600",
      });
    } else if (order.business_response === "adjusted") {
      out.push({
        at: order.created_at || new Date().toISOString(), icon: Pencil,
        title: "Tilpasningsforslag sendt",
        detail: order.customer_response === "accepted"
          ? "Kunden godkendte forslaget"
          : order.customer_response === "rejected"
          ? "Kunden afviste forslaget"
          : "Afventer kundens svar",
        toneCls: "border-amber-200 bg-amber-50", iconCls: "text-amber-600",
      });
    } else if (order.business_response === "rejected") {
      out.push({
        at: order.created_at || new Date().toISOString(), icon: XCircle,
        title: "Aftale afvist", toneCls: "border-border bg-background",
        iconCls: "text-muted-foreground",
      });
    }
    if (order.invoiced_at) {
      out.push({
        at: order.invoiced_at, icon: FileText, title: "Faktura oprettet",
        detail: order.invoice_external_id ? `Bilagsnr. ${order.invoice_external_id}` : undefined,
        toneCls: "border-border bg-background", iconCls: "text-foreground",
      });
    }
    if (order.due_date) {
      const overdue = new Date(order.due_date).getTime() < Date.now() && order.payment_status !== "paid" && order.payment_status !== "credited";
      out.push({
        at: order.due_date, icon: Clock,
        title: overdue ? "Forfaldsdato (overskredet)" : "Forfaldsdato",
        toneCls: overdue ? "border-destructive/40 bg-rose-50" : "border-border bg-background",
        iconCls: overdue ? "text-destructive" : "text-muted-foreground",
      });
    }
    // Rykkere vises ikke i aftalens tidslinje — de hører til faktura-/inkassohistorikken.
    if (order.paid_at) {
      out.push({
        at: order.paid_at, icon: CreditCard, title: "Faktura betalt",
        toneCls: "border-success/40 bg-emerald-50", iconCls: "text-success",
      });
    }
    if (order.credited_at) {
      out.push({
        at: order.credited_at, icon: Receipt, title: "Kreditnota oprettet",
        toneCls: "border-border bg-background", iconCls: "text-muted-foreground",
      });
    }
    if (order.voided_at) {
      out.push({
        at: order.voided_at, icon: Ban, title: "Faktura annulleret",
        toneCls: "border-border bg-background", iconCls: "text-muted-foreground",
      });
    }
    if (order.status === "in_progress") {
      out.push({
        at: new Date().toISOString(), icon: Play, title: "Arbejdet er i gang",
        toneCls: "border-violet-200 bg-violet-50", iconCls: "text-violet-600",
      });
    }
    if (order.status === "completed") {
      out.push({
        at: new Date().toISOString(), icon: CheckCircle2, title: "Udført",
        toneCls: "border-success/40 bg-emerald-50", iconCls: "text-success",
      });
    }
    if (order.status === "cancelled" && !order.voided_at) {
      out.push({
        at: new Date().toISOString(), icon: XCircle, title: "Aftale annulleret",
        toneCls: "border-border bg-background", iconCls: "text-muted-foreground",
      });
    }
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [order]);

  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tidslinje
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {events.length} {events.length === 1 ? "begivenhed" : "begivenheder"}
        </span>
      </div>
      <ol className="relative px-4 py-3">
        <span aria-hidden className="absolute left-[26px] top-3 bottom-3 w-px bg-border" />
        {events.map((e, i) => {
          const Icon = e.icon;
          return (
            <li key={i} className="relative flex items-start gap-3 py-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${e.toneCls}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${e.iconCls}`} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">{fmtDate(e.at)}</TooltipContent>
              </Tooltip>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {fmtRelative(e.at)}
                  </span>
                </div>
                {e.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}