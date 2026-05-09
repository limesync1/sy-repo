import { CreditCard, Bell, Receipt, Ban, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Fælles statusbadges der viser én aftales betalings-, rykker- og
 * kreditnotastatus på samme måde i både admin- og kundepanelet.
 * Statusserne synkroniseres automatisk fra virksomhedens regnskabsprogram,
 * så samme aftale altid ser ens ud begge steder.
 */
export type OrderForStatus = {
  /** Aftalens egen livscyklus-status (ikke betalingsstatus). Bruges til at skjule
   * betalings-/rykker-badges når selve aftalen er annulleret eller afvist. */
  status?: string | null;
  payment_status?: string | null;
  payment_status_synced_at?: string | null;
  paid_at?: string | null;
  due_date?: string | null;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  last_reminder_type?: string | null;
  credited_at?: string | null;
  voided_at?: string | null;
  invoice_external_id?: string | null;
  invoiced_at?: string | null;
  invoice_status?: string | null;
};

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })
    : null;

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("da-DK", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

/* ── betalings-pille ── */
const PAY: Record<string, { label: string; cls: string; dot: string; help: string }> = {
  paid:           { label: "Betalt",         cls: "border-success/40 bg-success/15 text-success",                  dot: "bg-success",         help: "Fakturaen er fuldt betalt." },
  partially_paid: { label: "Delvist betalt", cls: "border-amber-300 bg-amber-100 text-amber-900",                  dot: "bg-amber-500",       help: "Kunden har betalt en del af fakturaen." },
  overdue:        { label: "Forfalden",      cls: "border-destructive/40 bg-destructive/15 text-destructive",      dot: "bg-destructive",     help: "Betalingsfristen er overskredet." },
  unpaid:         { label: "Ikke betalt",    cls: "border-border bg-secondary text-foreground",                    dot: "bg-muted-foreground", help: "Faktura er sendt, men endnu ikke betalt." },
  sent:           { label: "Faktura sendt",  cls: "border-blue-300 bg-blue-100 text-blue-900",                     dot: "bg-blue-500",        help: "Fakturaen er sendt til kunden." },
  refunded:       { label: "Refunderet",     cls: "border-border bg-secondary text-muted-foreground",              dot: "bg-muted-foreground", help: "Beløbet er ført tilbage til kunden." },
  cancelled:      { label: "Annulleret",     cls: "border-border bg-secondary text-muted-foreground",              dot: "bg-muted-foreground", help: "Fakturaen er annulleret." },
  credited:       { label: "Krediteret",     cls: "border-border bg-secondary text-muted-foreground",              dot: "bg-muted-foreground", help: "Der er udstedt en kreditnota for fakturaen." },
};

const REMINDER_LABEL: Record<string, string> = {
  reminder1: "1. rykker",
  reminder2: "2. rykker",
  reminder3: "3. rykker",
  collection: "Inkasso",
};

/**
 * Bestem hvilken betalingsstatus vi viser. Vi prioriterer eksplicitte
 * lifecycle-felter (annulleret/krediteret/betalt) over den løbende
 * payment_status så den altid afspejler regnskabsprogrammets seneste tilstand.
 */
export function derivePaymentStatus(o: OrderForStatus): string | null {
  // En annulleret/afvist aftale skal ikke vise "Ubetalt" — det giver intet
  // mening at kræve betaling for noget der ikke længere er gyldigt.
  if (o.status === "cancelled" || o.status === "rejected") return null;
  if (o.voided_at) return "cancelled";
  if (o.credited_at) return "credited";
  if (o.paid_at || o.payment_status === "paid") return "paid";
  if (o.payment_status) return o.payment_status;
  if (o.due_date && new Date(o.due_date).getTime() < Date.now() && o.invoice_external_id) return "overdue";
  if (o.invoice_external_id || o.invoiced_at) return "unpaid";
  return null;
}

export const PaymentStatusBadge = ({ order, size = "sm" }: { order: OrderForStatus; size?: "xs" | "sm" }) => {
  const status = derivePaymentStatus(order);
  if (!status) return null;
  const m = PAY[status];
  if (!m) return null;
  const synced = fmtDateTime(order.payment_status_synced_at);
  const sizeCls = size === "xs" ? "text-[10px] h-5 px-1.5" : "text-[11px] h-5 px-2";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeCls} ${m.cls}`}
      title={`${m.help}${synced ? `\nSidst hentet fra regnskabsprogrammet: ${synced}.` : ""}`}
    >
      <CreditCard className="h-2.5 w-2.5" />
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

export const ReminderBadge = ({ order, size = "sm" }: { order: OrderForStatus; size?: "xs" | "sm" }) => {
  const count = Number(order.reminder_count ?? 0);
  if (count <= 0) return null;
  // Skjul rykker-pille når fakturaen er betalt/krediteret/annulleret —
  // så er rykkerne ikke længere relevante for status-overblikket.
  if (order.paid_at || order.credited_at || order.voided_at || order.payment_status === "paid") return null;
  const last = fmtDate(order.last_reminder_at);
  const sizeCls = size === "xs" ? "text-[10px] h-5 px-1.5" : "text-[11px] h-5 px-2";
  const isCollection = order.last_reminder_type === "collection" || count >= 4;
  const labelType = order.last_reminder_type && REMINDER_LABEL[order.last_reminder_type]
    ? REMINDER_LABEL[order.last_reminder_type]
    : count >= 3 ? "3. rykker" : count === 2 ? "2. rykker" : "1. rykker";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeCls} ${
        isCollection
          ? "border-destructive/40 bg-destructive/15 text-destructive"
          : "border-amber-300 bg-amber-100 text-amber-900"
      }`}
      title={`${count} ${count === 1 ? "rykker" : "rykkere"} sendt${last ? ` — sidst ${last}` : ""}.`}
    >
      {isCollection ? <AlertTriangle className="h-2.5 w-2.5" /> : <Bell className="h-2.5 w-2.5" />}
      {isCollection ? "Inkasso" : `${labelType}`}
      <span className="opacity-70">· {count}/3</span>
    </span>
  );
};

export const CreditNoteBadge = ({ order, size = "sm" }: { order: OrderForStatus; size?: "xs" | "sm" }) => {
  if (!order.credited_at) return null;
  const sizeCls = size === "xs" ? "text-[10px] h-5 px-1.5" : "text-[11px] h-5 px-2";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-muted-foreground font-medium ${sizeCls}`}
      title={`Kreditnota udstedt ${fmtDate(order.credited_at)}.`}
    >
      <Receipt className="h-2.5 w-2.5" />
      Kreditnota
    </span>
  );
};

export const VoidedBadge = ({ order, size = "sm" }: { order: OrderForStatus; size?: "xs" | "sm" }) => {
  if (!order.voided_at) return null;
  const sizeCls = size === "xs" ? "text-[10px] h-5 px-1.5" : "text-[11px] h-5 px-2";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-muted-foreground font-medium ${sizeCls}`}
      title={`Faktura annulleret ${fmtDate(order.voided_at)}.`}
    >
      <Ban className="h-2.5 w-2.5" />
      Annulleret
    </span>
  );
};

/** Samlet rad af alle relevante regnskabs-badges. */
export const AccountingStatusRow = ({ order, size = "sm" }: { order: OrderForStatus; size?: "xs" | "sm" }) => (
  <div className="inline-flex flex-wrap items-center gap-1.5">
    <PaymentStatusBadge order={order} size={size} />
    <ReminderBadge order={order} size={size} />
    <CreditNoteBadge order={order} size={size} />
    <VoidedBadge order={order} size={size} />
  </div>
);

/** Kompakt sammendrag pr. kunde — bruges på listen i admin Kunder. */
export type CustomerOrderSummary = {
  unpaid: number;     // antal aftaler hvor faktura er ubetalt (ikke forfalden)
  overdue: number;    // antal forfaldne fakturaer
  reminders: number;  // antal aftaler med mindst én rykker
  paid: number;       // antal betalte aftaler
  credited: number;   // antal krediterede
  cancelled: number;  // antal annullerede fakturaer
};

export function summarizeCustomerOrders(orders: OrderForStatus[]): CustomerOrderSummary {
  const s: CustomerOrderSummary = { unpaid: 0, overdue: 0, reminders: 0, paid: 0, credited: 0, cancelled: 0 };
  for (const o of orders) {
    // Spring annullerede aftaler helt over — de skal ikke fylde i overblikket.
    if (o.status === "cancelled" || o.status === "rejected") continue;
    const status = derivePaymentStatus(o);
    if (status === "paid") s.paid++;
    else if (status === "overdue") s.overdue++;
    else if (status === "credited") s.credited++;
    else if (status === "cancelled") s.cancelled++;
    else if (status === "unpaid" || status === "sent" || status === "partially_paid") s.unpaid++;
    if ((o.reminder_count ?? 0) > 0 && status !== "paid" && status !== "credited" && status !== "cancelled") {
      s.reminders++;
    }
  }
  return s;
}

/** Kompakt status-sammendrag på kundekortet i listen. */
export const CustomerOrderStatusSummary = ({ summary }: { summary: CustomerOrderSummary }) => {
  const items: Array<{ key: string; label: string; cls: string; icon: any; show: boolean }> = [
    { key: "overdue",   label: `${summary.overdue} forfalden`,    cls: "border-destructive/40 bg-destructive/15 text-destructive", icon: AlertTriangle, show: summary.overdue > 0 },
    { key: "reminders", label: `${summary.reminders} rykker`,     cls: "border-amber-300 bg-amber-100 text-amber-900",             icon: Bell,          show: summary.reminders > 0 },
    { key: "unpaid",    label: `${summary.unpaid} ubetalt`,        cls: "border-border bg-secondary text-foreground",               icon: CreditCard,    show: summary.unpaid > 0 },
    { key: "paid",      label: `${summary.paid} betalt`,           cls: "border-success/40 bg-success/15 text-success",             icon: CheckCircle2,  show: summary.paid > 0 },
  ];
  const visible = items.filter(i => i.show);
  if (visible.length === 0) return null;
  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      {visible.map(i => {
        const Icon = i.icon;
        return (
          <span
            key={i.key}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${i.cls}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {i.label}
          </span>
        );
      })}
    </div>
  );
};