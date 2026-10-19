// Søgbar servicevælger til "Opret bestilling".
// Viser præcise detaljer pr. service (pris uden moms, prisberegnerfelter,
// intervaller, beskrivelse) i et kompakt, læsevenligt kort.
import { useMemo, useState } from "react";
import { Plus, Search, Calculator, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IndustryIcon } from "@/components/IndustryIcon";
import { formatPrice } from "@/lib/price-format";
import { INTERVAL_LABELS } from "@/types/service";
import { cn } from "@/lib/utils";

type CalcStep = { id: string; label: string; unit: string; price_per_unit: number; sort_order: number | null };
export type PickerService = {
  id: string; name: string; description: string | null;
  pricing_type: "fast_pris" | "timepris" | "prisberegner";
  base_price: number | null; unit: string | null;
  interval_options: string[] | null; calculator_steps?: CalcStep[];
  service_category?: string | null; subcategory?: string | null;
};

const priceLine = (s: PickerService) => {
  if (s.pricing_type === "timepris") return `${formatPrice(s.base_price)} pr. time`;
  if (s.pricing_type === "fast_pris") return `${formatPrice(s.base_price)}${s.unit ? ` pr. ${s.unit}` : ""}`;
  return Number(s.base_price) > 0 ? `Fra ${formatPrice(s.base_price)}` : "Beregnes ud fra felter";
};
const typeLabel = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" } as const;

type Props = { services: PickerService[]; selectedIds: string[]; onAdd: (id: string) => void };

export default function ServicePicker({ services, selectedIds, onAdd }: Props) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return services
      .filter((s) => !selectedIds.includes(s.id))
      .filter((s) => !needle || [s.name, s.service_category, s.subcategory, s.description, ...(s.calculator_steps || []).map((c) => c.label)]
        .some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => (a.service_category || "").localeCompare(b.service_category || "", "da") || a.name.localeCompare(b.name, "da"));
  }, [services, selectedIds, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg efter service, kategori eller felt…" className="h-11 pl-9 bg-background" aria-label="Søg efter service" />
      </div>
      <div className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card/40 p-1.5">
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {services.length === selectedIds.length ? "Alle services er valgt." : "Ingen services matcher din søgning."}
          </p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {list.map((s) => {
              const steps = [...(s.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              const intervals = s.interval_options?.length ? s.interval_options : ["engangskøb"];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(s.id)}
                    className="group flex h-full w-full min-w-0 flex-col gap-1.5 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-accent/60 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <IndustryIcon category={s.service_category} subcategory={s.subcategory ?? undefined} name={s.name} className="h-7 w-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold leading-tight text-foreground">{s.name}</p>
                        {(s.subcategory || s.service_category) && (
                          <p className="truncate text-[11px] text-muted-foreground">{s.subcategory || s.service_category}</p>
                        )}
                      </div>
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground group-hover:bg-accent group-hover:text-accent-foreground" aria-hidden>
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                      <span className="font-semibold text-foreground tabular-nums">{priceLine(s)}</span>
                      <span className="text-[10.5px] text-muted-foreground">uden moms · {typeLabel[s.pricing_type]}</span>
                    </div>
                    {s.description && (
                      <p className="line-clamp-2 break-words text-[11px] leading-4 text-muted-foreground" title={s.description}>{s.description}</p>
                    )}
                    {steps.length > 0 && (
                      <div className="flex min-w-0 flex-wrap items-center gap-1" title={steps.map((c) => `${c.label}: ${formatPrice(c.price_per_unit)} pr. ${c.unit}`).join("\n")}>
                        <Calculator className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Prisberegnerfelter" />
                        {steps.slice(0, 4).map((c) => (
                          <span key={c.id} className="max-w-[140px] truncate rounded bg-secondary px-1.5 py-px text-[10px] leading-4 text-foreground/80">
                            {c.label} · {formatPrice(c.price_per_unit)}/{c.unit}
                          </span>
                        ))}
                        {steps.length > 4 && <span className="text-[10px] text-muted-foreground">+{steps.length - 4} felter</span>}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Intervaller" />
                      {intervals.slice(0, 4).map((iv) => (
                        <span key={iv} className={cn("truncate rounded border border-border px-1.5 py-px text-[10px] leading-4 text-muted-foreground")}>
                          {INTERVAL_LABELS[iv as keyof typeof INTERVAL_LABELS] || iv}
                        </span>
                      ))}
                      {intervals.length > 4 && <span className="text-[10px] text-muted-foreground">+{intervals.length - 4}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
