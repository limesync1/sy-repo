// Søgbar servicevælger til "Opret bestilling".
// Kompakte rækker: navn, pris uden moms, varenr. (ved regnskabsintegration),
// intervaller og prisberegnerfelter. Beskrivelse vises kun ved "Detaljer".
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronDown, Calculator, Repeat, Hash, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { IndustryIcon } from "@/components/IndustryIcon";
import { formatPrice } from "@/lib/price-format";
import { INTERVAL_LABELS } from "@/types/service";
import { useActiveAccountingIntegration } from "@/hooks/useActiveAccountingIntegration";
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
  return Number(s.base_price) > 0 ? `Fra ${formatPrice(s.base_price)}` : "Prisberegner";
};
const intervalLabel = (iv: string) => INTERVAL_LABELS[iv as keyof typeof INTERVAL_LABELS] || iv;

type Props = { businessId?: string; services: PickerService[]; selectedIds: string[]; onAdd: (id: string) => void };

export default function ServicePicker({ businessId, services, selectedIds, onAdd }: Props) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: integration } = useActiveAccountingIntegration(businessId);
  const { data: productNumbers } = useQuery({
    queryKey: ["service-product-numbers", businessId],
    enabled: !!businessId && !!integration,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("accounting_product_links" as any)
        .select("service_id, external_product_number").eq("business_id", businessId!);
      return new Map(((data || []) as any[]).map((r) => [r.service_id as string, (r.external_product_number as string | null) ?? null]));
    },
  });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return services
      .filter((s) => !selectedIds.includes(s.id))
      .filter((s) => !needle || [s.name, s.service_category, s.subcategory, productNumbers?.get(s.id), ...(s.calculator_steps || []).map((c) => c.label)]
        .some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));
  }, [services, selectedIds, q, productNumbers]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={integration ? "Søg navn, kategori eller varenr.…" : "Søg navn eller kategori…"} className="h-11 bg-background pl-9 pr-10 text-base sm:text-sm" aria-label="Søg efter service" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Ryd søgning" className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="max-h-[min(340px,45vh)] divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border bg-background">
        {list.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            {services.length > 0 && services.every((s) => selectedIds.includes(s.id)) ? "Alle services er valgt." : "Ingen services matcher din søgning."}
          </li>
        )}
        {list.map((s) => {
          const steps = [...(s.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          const intervals = s.interval_options?.length ? s.interval_options : ["engangskøb"];
          const varenr = productNumbers?.get(s.id);
          const open = openId === s.id;
          const hasDetails = steps.length > 0 || !!s.description || intervals.length > 1;
          return (
            <li key={s.id} className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
                <button type="button" onClick={() => onAdd(s.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 text-left hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60" aria-label={`Tilføj ${s.name}`}>
                  <IndustryIcon category={s.service_category} subcategory={s.subcategory ?? undefined} name={s.name} className="h-7 w-7 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{s.name}</span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-muted-foreground">
                      <span className="font-semibold tabular-nums text-foreground/80">{priceLine(s)} <span className="font-normal text-muted-foreground">uden moms</span></span>
                      <span className="inline-flex items-center gap-0.5"><Repeat className="h-3 w-3" />{intervals.length === 1 ? intervalLabel(intervals[0]) : `${intervals.length} intervaller`}</span>
                      {integration && (
                        <span className={cn("inline-flex items-center gap-0.5 tabular-nums", !varenr && "text-amber-700 dark:text-amber-300")}>
                          <Hash className="h-3 w-3" />{varenr ? `Varenr. ${varenr}` : "Intet varenr."}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden><Plus className="h-4 w-4" /></span>
                </button>
                {hasDetails && (
                  <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open} aria-label={open ? "Skjul detaljer" : "Vis detaljer"} className="inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                  </button>
                )}
              </div>
              {open && (
                <div className="space-y-1.5 bg-secondary/30 px-3 pb-2.5 pt-1.5 text-[11px] leading-4 text-muted-foreground">
                  {(s.subcategory || s.service_category) && <p className="font-medium text-foreground/80">{s.subcategory || s.service_category}</p>}
                  {steps.length > 0 && (
                    <div>
                      <p className="mb-0.5 inline-flex items-center gap-1 font-semibold text-foreground/80"><Calculator className="h-3 w-3" />Prisberegnerfelter</p>
                      <ul className="space-y-0.5">
                        {steps.map((c) => (
                          <li key={c.id} className="flex min-w-0 justify-between gap-2">
                            <span className="min-w-0 truncate" title={c.label}>{c.label}</span>
                            <span className="shrink-0 tabular-nums">{formatPrice(c.price_per_unit)} / {c.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {intervals.length > 1 && (
                    <p className="break-words"><span className="font-semibold text-foreground/80">Intervaller: </span>{intervals.map(intervalLabel).join(", ")}</p>
                  )}
                  {s.description && <p className="line-clamp-3 break-words" title={s.description}>{s.description}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
