// Søgbar servicevælger til "Opret bestilling".
// Valgte services bliver på deres plads i listen og folder deres indstillinger
// ud lige under rækken (renderSelected), så listen aldrig hopper.
import { ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronDown, Calculator, Repeat, Hash, X, Check, Trash2 } from "lucide-react";
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
export const intervalLabel = (iv: string) => INTERVAL_LABELS[iv as keyof typeof INTERVAL_LABELS] || iv;

type Props = {
  businessId?: string;
  services: PickerService[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  renderSelected: (id: string) => ReactNode;
  summary?: ReactNode;
};

export default function ServicePicker({ businessId, services, selectedIds, onAdd, onRemove, renderSelected, summary }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
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

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.service_category || "Andet"))).sort((a, b) => a.localeCompare(b, "da")),
    [services],
  );

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = services
      .filter((s) => !cat || (s.service_category || "Andet") === cat)
      .filter((s) => selectedIds.includes(s.id) || !needle || [s.name, s.service_category, s.subcategory, s.description, productNumbers?.get(s.id), ...(s.calculator_steps || []).map((c) => c.label)]
        .some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));
    const map = new Map<string, PickerService[]>();
    for (const s of filtered) {
      const k = s.service_category || "Andet";
      map.set(k, [...(map.get(k) || []), s]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "da"));
  }, [services, selectedIds, q, cat, productNumbers]);

  const jumpTo = (id: string) => document.getElementById(`svc-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
    <div className="min-w-0 space-y-2">
      <div className="sticky -top-1 z-10 space-y-2 bg-card pb-1 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={integration ? "Søg navn, kategori eller varenr.…" : "Søg service…"} className="h-11 bg-background pl-9 pr-11 text-base sm:text-sm" aria-label="Søg efter service" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Ryd søgning" className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filtrér efter kategori">
            {[null, ...categories].map((c) => (
              <button key={c ?? "all"} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                className={cn("min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary")}>
                {c ?? "Alle"}
              </button>
            ))}
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-sm">
            <span className="font-semibold">{summary}</span>
            {selectedIds.map((id) => {
              const s = services.find((x) => x.id === id);
              return s ? (
                <button key={id} type="button" onClick={() => jumpTo(id)} className="min-h-9 max-w-[12rem] truncate rounded-full border border-border bg-background px-2.5 text-xs hover:bg-secondary">{s.name}</button>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background lg:max-h-[min(62vh,640px)] lg:overflow-y-auto lg:overscroll-contain">
        {groups.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Ingen services matcher din søgning.</p>
        )}
        {groups.map(([group, list]) => (
          <section key={group}>
            {categories.length > 1 && !cat && (
              <h4 className="border-b border-border bg-secondary/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
            )}
            <ul className="divide-y divide-border">
              {list.map((s) => {
                const steps = [...(s.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                const intervals = s.interval_options?.length ? s.interval_options : ["engangskøb"];
                const varenr = productNumbers?.get(s.id);
                const selected = selectedIds.includes(s.id);
                const open = openId === s.id;
                const hasDetails = steps.length > 0 || !!s.description;
                return (
                  <li key={s.id} id={`svc-row-${s.id}`} className={cn("min-w-0 scroll-mt-32", selected && "bg-accent/5")}>
                    <div className="flex min-w-0 items-start gap-2 px-2.5 py-2">
                      <IndustryIcon category={s.service_category} subcategory={s.subcategory ?? undefined} name={s.name} className="mt-1 h-7 w-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold leading-snug text-foreground">{s.name}</p>
                        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs leading-5 text-muted-foreground">
                          <span className="font-semibold tabular-nums text-foreground">{priceLine(s)} <span className="font-normal text-muted-foreground">uden moms</span></span>
                          <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{intervals.length === 1 ? intervalLabel(intervals[0]) : intervals.map(intervalLabel).join(" · ")}</span>
                          {integration && (
                            <span className={cn("inline-flex items-center gap-0.5 tabular-nums", !varenr && "text-amber-700 dark:text-amber-300")}>
                              <Hash className="h-3 w-3" />{varenr ? `Varenr. ${varenr}` : "Intet varenr."}
                            </span>
                          )}
                        </p>
                        {(steps.length > 0 || s.description) && !open && (
                          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                            {steps.length > 0
                              ? steps.map((c) => `${c.label} ${formatPrice(c.price_per_unit)}/${c.unit}`).join(" · ")
                              : s.description}
                          </p>
                        )}
                        {hasDetails && (
                          <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}
                            className="mt-0.5 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline">
                            {open ? "Skjul detaljer" : "Detaljer"}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                          </button>
                        )}
                      </div>
                      {selected ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="hidden items-center gap-1 text-xs font-semibold text-accent sm:inline-flex"><Check className="h-3.5 w-3.5" />Valgt</span>
                          <button type="button" onClick={() => onRemove(s.id)} aria-label={`Fjern ${s.name}`}
                            className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border px-2.5 text-sm text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Fjern</span>
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => onAdd(s.id)} aria-label={`Tilføj ${s.name}`}
                          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Tilføj</span>
                        </button>
                      )}
                    </div>
                    {open && (
                      <div className="space-y-1.5 px-3 pb-2.5 pl-12 text-xs leading-5 text-muted-foreground">
                        {s.description && <p className="line-clamp-4 break-words" title={s.description}>{s.description}</p>}
                        {steps.length > 0 && (
                          <div>
                            <p className="inline-flex items-center gap-1 font-semibold text-foreground"><Calculator className="h-3 w-3" />Prisberegnerfelter</p>
                            <ul>
                              {steps.map((c) => (
                                <li key={c.id} className="flex min-w-0 justify-between gap-2">
                                  <span className="min-w-0 break-words">{c.label}</span>
                                  <span className="shrink-0 tabular-nums">{formatPrice(c.price_per_unit)} / {c.unit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {selected && <div className="px-2.5 pb-3 sm:pl-12 lg:hidden">{renderSelected(s.id)}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
    <aside className="hidden min-w-0 lg:sticky lg:top-0 lg:block" aria-label="Valgte services">
      <h4 className="mb-2 text-sm font-semibold text-foreground">Valgte services</h4>
      {selectedIds.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">Tryk «Tilføj» ved en service. Dens interval, felter og startdato vises her.</p>
      ) : (
        <div className="max-h-[min(70vh,720px)] space-y-3 overflow-y-auto overscroll-contain pr-1">
          {selectedIds.map((id) => {
            const svc = services.find((x) => x.id === id);
            return (
              <div key={id} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold">{svc?.name}</p>
                  <button type="button" onClick={() => onRemove(id)} aria-label={`Fjern ${svc?.name ?? "service"}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                {renderSelected(id)}
              </div>
            );
          })}
        </div>
      )}
    </aside>
    </div>
  );
}
