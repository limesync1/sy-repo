import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
      <div role="radiogroup" aria-label="Fakturainterval" className="grid gap-2 sm:grid-cols-2" onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
        event.preventDefault();
        const index = options.findIndex((option) => option.value === value.interval);
        const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const next = (index + direction + options.length) % options.length;
        pick(options[next].value);
        event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
      }}>
        {options.map((o) => {
          const active = value.interval === o.value;
          return (
            <Button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              variant="outline"
              onClick={() => pick(o.value)}
              className={cn(
                "h-auto min-h-14 items-start justify-start gap-2.5 whitespace-normal rounded-md border px-3 py-2.5 text-left transition-colors",
                active ? "border-accent bg-accent/10 text-foreground hover:bg-accent/15" : "border-border bg-background hover:border-accent/40",
              )}
            >
              <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", active ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground/50")}>{active && <Check className="h-3 w-3" />}</span>
              <span className="min-w-0 leading-snug"><span className="block text-sm font-semibold text-foreground">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{o.hint}</span>}</span>
            </Button>
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
