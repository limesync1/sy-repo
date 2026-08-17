import { z } from "zod";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/admin/shared/AdminUI";

export const SettingsSchema = z.object({
  stripe_publishable_key: z.string().trim().regex(/^(pk_(test|live)_[A-Za-z0-9_]+)?$/, "Skal starte med pk_test_ eller pk_live_").nullable(),
  base_price_dkk: z.number().min(0).max(100000),
  price_route_planning_dkk: z.number().min(0).max(100000),
  price_accounting_integration_dkk: z.number().min(0).max(100000),
  price_data_import_dkk: z.number().min(0).max(100000),
  price_per_employee_login_dkk: z.number().min(0).max(100000),
  startup_fee_dkk: z.number().min(0).max(100000),
  discount_quarterly_pct: z.number().min(0).max(100),
  discount_yearly_pct: z.number().min(0).max(100),
  trial_days: z.number().int().min(0).max(365),
});

export const detectStripeMode = (key: string, expectedPrefix: string) => {
  if (!key) return null;
  if (key.startsWith(`${expectedPrefix}_live_`)) return { mode: "Live", tone: "bg-emerald-500/10 text-emerald-700" };
  if (key.startsWith(`${expectedPrefix}_test_`)) return { mode: "Test", tone: "bg-amber-500/10 text-amber-700" };
  return { mode: "Ugyldig", tone: "bg-destructive/10 text-destructive" };
};

export const Field = ({ label, v, on, type = "text", badge, error, rightAction }: { label: string; v: string; on: (v: string) => void; type?: string; badge?: { mode: string; tone: string } | null; error?: string; rightAction?: React.ReactNode }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <FieldLabel className="mb-0">{label}</FieldLabel>
      <span className="flex items-center gap-2">
        {badge && (
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.tone}`}>
            {badge.mode}
          </span>
        )}
        {rightAction}
      </span>
    </div>
    <Input type={type} value={v} onChange={(e) => on(e.target.value)} className={`h-10 font-mono text-xs ${error ? "border-destructive focus-visible:ring-destructive" : ""}`} />
    {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
  </div>
);

export const NumField = ({ label, v, on, hint, error }: { label: string; v: any; on: (v: number) => void; hint?: string; error?: string }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <Input type="number" value={v ?? 0} onChange={(e) => on(Number(e.target.value))} className={`h-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`} />
    {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);