// Delte typer, konstanter og småkomponenter til CreateBusinessWizard-trin.
import { Calculator, Copy, Inbox, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Pricing = {
  base_price_dkk: number;
  price_accounting_integration_dkk: number;
  price_per_employee_login_dkk: number;
  startup_fee_dkk: number;
  discount_quarterly_pct: number;
  discount_yearly_pct: number;
  trial_days: number;
};

export type BillingPeriod = "monthly" | "quarterly" | "yearly";
export type FeatureKey = "accounting_integration" | "leads" | "livechat";

export const BILLING_OPTIONS: { value: BillingPeriod; label: string; months: number }[] = [
  { value: "monthly", label: "Månedlig", months: 1 },
  { value: "quarterly", label: "Kvartal (rabat)", months: 3 },
  { value: "yearly", label: "Årlig (bedste pris)", months: 12 },
];

export const FEATURES: { key: FeatureKey; icon: typeof Calculator; title: string; free: boolean; description: string }[] = [
  { key: "accounting_integration", icon: Calculator, free: false, title: "Regnskabsintegration", description: "e-conomic / Dinero — auto-fakturering." },
  { key: "leads", icon: Inbox, free: true, title: "Leads (Indhent 3 tilbud)", description: "Modtag kundehenvendelser." },
  { key: "livechat", icon: MessageCircle, free: true, title: "Livechat på virksomhedssiden", description: "Lad besøgende skrive direkte." },
];

export const formatDkk = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n));

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function CopyRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", highlight && "bg-amber-50")}>
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <code className={cn("flex-1 truncate text-xs", mono && "font-mono")}>{value}</code>
      <Button size="sm" variant="ghost" className="h-7 px-2"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Kopieret"); }}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
