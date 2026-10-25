import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVOICE_INTERVAL_OPTIONS, UNIT_LABEL, type InvoiceInterval, type InvoiceIntervalValue, type IntervalUnit } from "@/lib/invoice-interval";

type Props = {
  value: InvoiceIntervalValue;
  onChange: (v: InvoiceIntervalValue) => void;
  /** Tekst for "arv" (fx "Brug virksomhedens standard"). Udelades for virksomhedsstandarden. */
  inheritLabel?: string;
  inheritHint?: string;
};

/** Fælles valg af fakturainterval — bruges i Regnskab, kunde og aftale. */
export function InvoiceIntervalPicker({ value, onChange, inheritLabel, inheritHint }: Props) {
  const options: { value: InvoiceInterval | null; label: string; hint: string }[] = [
    ...(inheritLabel ? [{ value: null, label: inheritLabel, hint: inheritHint ?? "" }] : []),
    ...INVOICE_INTERVAL_OPTIONS,
  ];
  const pick = (iv: InvoiceInterval | null) =>
    onChange(iv === "custom" ? { interval: iv, count: value.count ?? 3, unit: value.unit ?? "week" } : { interval: iv, count: null, unit: null });

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Fakturainterval" className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = value.interval === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(o.value)}
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active ? "border-accent bg-accent/10 ring-1 ring-inset ring-accent/40" : "border-border bg-card hover:border-accent/40",
              )}
            >
              <span className="block text-sm font-semibold text-foreground">{o.label}</span>
              {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
            </button>
          );
        })}
      </div>
      {value.interval === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/40 p-3">
          <span className="text-sm text-foreground">Saml besøg hver</span>
          <Input
            type="number" inputMode="numeric" min={1} max={365}
            aria-label="Antal"
            value={value.count ?? 1}
            onChange={(e) => onChange({ ...value, count: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })}
            className="h-11 w-20 text-center"
          />
          <Select value={value.unit ?? "week"} onValueChange={(u) => onChange({ ...value, unit: u as IntervalUnit })}>
            <SelectTrigger className="h-11 w-36" aria-label="Enhed"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(UNIT_LABEL) as IntervalUnit[]).map((u) => (
                <SelectItem key={u} value={u}>{(value.count ?? 1) === 1 ? UNIT_LABEL[u][0] : UNIT_LABEL[u][1]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
