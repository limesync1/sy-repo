import {
  AlertCircle, CheckCircle2, Clock, Play, Pencil,
  CreditCard, FileText, Sparkles,
} from "lucide-react";

type Order = {
  status?: string | null;
  business_response?: string | null;
  customer_response?: string | null;
  payment_status?: string | null;
  invoice_external_id?: string | null;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  due_date?: string | null;
  next_service_date?: string | null;
};

type Step = {
  title: string;
  description: string;
  icon: typeof AlertCircle;
  tone: "info" | "warning" | "danger" | "success" | "neutral";
  action?: string;
  terminal?: boolean;
};

const TONE_CLS: Record<Step["tone"], { wrap: string; iconWrap: string; icon: string; title: string }> = {
  info:    { wrap: "border-blue-200 bg-blue-50",          iconWrap: "bg-blue-100",   icon: "text-blue-700",   title: "text-blue-900" },
  warning: { wrap: "border-amber-200 bg-amber-50",        iconWrap: "bg-amber-100",  icon: "text-amber-700",  title: "text-amber-900" },
  danger:  { wrap: "border-destructive/30 bg-destructive/5", iconWrap: "bg-destructive/10", icon: "text-destructive", title: "text-destructive" },
  success: { wrap: "border-success/30 bg-success/10",     iconWrap: "bg-success/15",  icon: "text-success",    title: "text-success" },
  neutral: { wrap: "border-border bg-card",                iconWrap: "bg-secondary",  icon: "text-foreground", title: "text-foreground" },
};

function computeStep(order: Order, hasAccountingIntegration: boolean): Step | null {
  const s = order.status;
  const ps = order.payment_status;
  const isOverdue = order.due_date
    ? new Date(order.due_date).getTime() < Date.now() && ps !== "paid" && ps !== "credited"
    : false;

  if (s === "pending" && !order.business_response) {
    return {
      title: "Svar på bestillingen",
      description: "Kunden venter på dig. Godkend, tilpas pris eller afvis aftalen.",
      icon: AlertCircle, tone: "danger",
    };
  }
  if (s === "pending" && order.business_response === "adjusted" && order.customer_response === "rejected") {
    return {
      title: "Send et nyt forslag",
      description: "Kunden afviste dit forslag. Tilpas igen eller annullér aftalen.",
      icon: Pencil, tone: "warning",
    };
  }
  if (s === "pending" && order.business_response === "adjusted") {
    return {
      title: "Afventer kundens svar",
      description: "Kunden skal godkende dit tilpassede forslag, vent venligst.",
      icon: Clock, tone: "info",
    };
  }
  if (s === "confirmed") {
    return {
      title: "Start arbejdet",
      description: "Aftalen er bekræftet. Markér som 'I gang', når du er på vej eller starter aftalen.",
      icon: Play, tone: "info",
    };
  }
  if (s === "in_progress") {
    return {
      title: hasAccountingIntegration ? "Afslut og fakturér" : "Afslut aftalen",
      description: hasAccountingIntegration
        ? "Markér aftalen som udført — fakturaen sendes automatisk til regnskabsprogrammet."
        : "Markér aftalen som udført.",
      icon: CheckCircle2, tone: "success",
    };
  }
  if (s === "cancelled") {
    return {
      title: "Aftalen er annulleret",
      description: "Der er ingen handlinger tilbage. Du kan slette aftalen eller bruge den til reference.",
      icon: AlertCircle, tone: "neutral", terminal: true,
    };
  }
  // s === completed → fokus skifter til betaling
  // Hvis der ikke er et regnskabsprogram integreret giver det ingen mening at
  // vise faktura-/betalings-trin — Serviceydere kan ikke selv håndtere
  // fakturering. Vi viser i stedet et neutralt "udført"-trin.
  if (!hasAccountingIntegration && (s === "completed" || ps == null || ps === "unpaid")) {
    return {
      title: "Aftalen er udført",
      description: "Du har ikke et regnskabsprogram integreret. Tilføj en regnskabsintegration for at se faktura- og betalingsstatus her.",
      icon: CheckCircle2, tone: "success", terminal: true,
    };
  }
  if (ps === "paid") {
    return {
      title: "Færdigt — alt er på plads",
      description: "Kunden har betalt og aftalen er fuldført.",
      icon: Sparkles, tone: "success", terminal: true,
    };
  }
  if (ps === "credited") {
    return {
      title: "Krediteret",
      description: "Fakturaen er krediteret i regnskabsprogrammet.",
      icon: FileText, tone: "neutral", terminal: true,
    };
  }
  if (!order.invoice_external_id) {
    if (!hasAccountingIntegration) return null;
    return {
      title: "Faktura mangler",
      description: "Aftalen er udført men ikke faktureret. Tjek at regnskabsintegrationen kører eller send manuelt.",
      icon: FileText, tone: "warning",
    };
  }
  if (isOverdue) {
    if (!hasAccountingIntegration) return null;
    return {
      title: "Faktura forfalden",
      description: "Forfaldsdatoen er overskredet. Rykkere håndteres automatisk i dit regnskabsprogram (rykkerkørsel).",
      icon: AlertCircle, tone: "danger",
    };
  }
  if (ps === "unpaid" || !ps) {
    if (!hasAccountingIntegration) return null;
    return {
      title: "Afventer betaling",
      description: order.due_date
        ? `Forfaldsdato: ${new Date(order.due_date).toLocaleDateString("da-DK", { day: "numeric", month: "long" })}. Du får automatisk besked når kunden betaler.`
        : "Fakturaen er sendt. Du får automatisk besked når kunden betaler.",
      icon: CreditCard, tone: "info",
    };
  }
  if (ps === "partially_paid") {
    if (!hasAccountingIntegration) return null;
    return {
      title: "Delvist betalt",
      description: "Kunden har betalt en del af fakturaen. Bekræft restbeløbet i dit regnskabsprogram.",
      icon: CreditCard, tone: "warning",
    };
  }
  return null;
}

export default function NextStepCard({
  order,
  hasAccountingIntegration = false,
}: {
  order: Order;
  hasAccountingIntegration?: boolean;
}) {
  const step = computeStep(order, hasAccountingIntegration);
  if (!step) return null;
  const cls = TONE_CLS[step.tone];
  const Icon = step.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cls.wrap}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls.iconWrap}`}>
        <Icon className={`h-4 w-4 ${cls.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        {!step.terminal && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Næste skridt
          </span>
        )}
        <p className={`${step.terminal ? "" : "mt-0.5"} text-sm font-semibold ${cls.title}`}>{step.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
      </div>
    </div>
  );
}