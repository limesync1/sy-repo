// Søgbar servicevælger til "Opret bestilling".
// Valgte services bliver på deres plads i listen og folder deres indstillinger
// ud lige under rækken (renderSelected), så listen aldrig hopper.
import { ReactNode, useEffect, useMemo, useState } from "react";
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
  const steps = s.calculator_steps || [];
  if (steps.length === 1) return `${formatPrice(steps[0].price_per_unit)} pr. ${steps[0].unit}`;
  return steps.length ? `Prisberegner · ${steps.length} felter` : "Prisberegner";
};
const norm = (v: string) => v.toLocaleLowerCase("da").normalize("NFC").trim();
function Hl({ text, q }: { text: string; q: string }) {
  const n = norm(q);
  if (!n) return <>{text}</>;
  const i = text.toLocaleLowerCase("da").indexOf(n);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-accent/25 px-0.5 text-foreground">{text.slice(i, i + n.length)}</mark>{text.slice(i + n.length)}</>;
}
export const intervalLabel = (iv: string) => INTERVAL_LABELS[iv as keyof typeof INTERVAL_LABELS] || iv;

type Props = {
  businessId?: string;
  services: PickerService[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  renderSelected: (id: string) => ReactNode;
  summary?: ReactNode;
  summaryAmount?: ReactNode;
  subtotalOf?: (id: string) => ReactNode;
};

export default function ServicePicker({ businessId, services, selectedIds, onAdd, onRemove, renderSelected, summary, summaryAmount, subtotalOf }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const lastAdded = selectedIds[selectedIds.length - 1];
  useEffect(() => { if (lastAdded) { setMobileOpenId(lastAdded); setTrayOpen(true); } }, [lastAdded]);
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

  const { data: usage } = useQuery({
    queryKey: ["service-usage", businessId],
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("service_id, orders!inner(business_id)")
        .eq("orders.business_id", businessId!).not("service_id", "is", null).limit(1000);
      const m = new Map<string, number>();
      for (const r of (data || []) as any[]) m.set(r.service_id, (m.get(r.service_id) || 0) + 1);
      return m;
    },
  });
  const mostUsed = useMemo(() => {
    if (!usage || services.length < 6) return [] as string[];
    return [...usage.entries()].filter(([id]) => services.some((s) => s.id === id)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  }, [usage, services]);

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.service_category || "Andet"))).sort((a, b) => a.localeCompare(b, "da")),
    [services],
  );

  const groups = useMemo(() => {
    const needle = norm(q);
    const filtered = services
      .filter((s) => !cat || (s.service_category || "Andet") === cat)
      .filter((s) => !needle || [s.name, s.service_category, s.subcategory, s.description, productNumbers?.get(s.id), ...(s.calculator_steps || []).map((c) => c.label)]
        .some((v) => v && norm(v).includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));
    const map = new Map<string, PickerService[]>();
    const showTop = !needle && !cat && mostUsed.length > 0;
    if (showTop) map.set("Mest brugt", filtered.filter((s) => mostUsed.includes(s.id)).sort((a, b) => mostUsed.indexOf(a.id) - mostUsed.indexOf(b.id)));
    for (const s of filtered) {
      if (showTop && mostUsed.includes(s.id)) continue;
      const k = s.service_category || "Andet";
      map.set(k, [...(map.get(k) || []), s]);
    }
    return Array.from(map.entries()).filter(([, l]) => l.length).sort(([a], [b]) => a === "Mest brugt" ? -1 : b === "Mest brugt" ? 1 : a.localeCompare(b, "da"));
  }, [services, q, cat, productNumbers, mostUsed]);
  const shownCount = groups.reduce((n, [, l]) => n + l.length, 0);
  const hiddenSelected = selectedIds.filter((id) => !groups.some(([, l]) => l.some((s) => s.id === id)));

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">Ingen aktive services</p>
        <p className="mt-1 text-xs text-muted-foreground">Opret eller aktivér en service først.</p>
        <a href="/virksomhed?tab=services" className="mt-3 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90">Gå til Services</a>
      </div>
    );
  }

  const enterTarget = q.trim() ? groups.flatMap(([, list]) => list).find((s) => !selectedIds.includes(s.id))?.id : undefined;
  const catCount = (c: string | null) => {
    const needle = norm(q);
    return services.filter((s) => (!c || (s.service_category || "Andet") === c) && (!needle || [s.name, s.service_category, s.subcategory, s.description].some((v) => v && norm(v).includes(needle)))).length;
  };

  const jumpTo = (id: string) => {
    if (hiddenSelected.includes(id)) { setQ(""); setCat(null); setTimeout(() => jumpTo(id), 50); return; }
    document.getElementById(`svc-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectedList = (mobile: boolean) => (
    <div className="space-y-2">
      {selectedIds.map((id) => {
        const svc = services.find((x) => x.id === id);
        const isOpen = mobile ? mobileOpenId === id : !collapsed.includes(id);
        const toggle = () => mobile ? setMobileOpenId(isOpen ? null : id) : setCollapsed((p) => isOpen ? [...p, id] : p.filter((x) => x !== id));
        return (
          <div key={id} className="min-w-0 overflow-hidden rounded-lg border border-accent/30 bg-card">
            <div className="flex items-center gap-1 pr-1">
              <button type="button" onClick={toggle} aria-expanded={isOpen} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2.5 text-left">
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{svc?.name}</span>
                {subtotalOf && <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{subtotalOf(id)}</span>}
              </button>
              <button type="button" onClick={() => onRemove(id)} aria-label={`Fjern ${svc?.name ?? "service"}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 sm:h-9 sm:w-9">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {isOpen && <div className="border-t border-border/60 p-1.5">{renderSelected(id)}</div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={cn("grid gap-3 lg:items-start", selectedIds.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_15rem]")}>
    <div className="min-w-0 space-y-2">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => {
            if (e.key !== "Enter" || e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            if (enterTarget) { onAdd(enterTarget); setQ(""); }
          }} placeholder={integration ? "Søg navn, kategori eller varenr.…" : "Søg service…"} className="h-11 bg-background pl-9 pr-11 text-base sm:text-sm" aria-label="Søg efter service" enterKeyHint="done" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Ryd søgning" className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filtrér efter kategori">
            {[null, ...categories].map((c) => {
              const n = catCount(c);
              return (
                <button key={c ?? "all"} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                  className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-secondary",
                    n === 0 && cat !== c && "opacity-50")}>
                  {c ?? "Alle"}<span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", cat === c ? "bg-primary-foreground/20" : "bg-secondary text-muted-foreground")}>{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground" aria-live="polite">
        <span>{shownCount} {shownCount === 1 ? "service" : "services"}{q.trim() || cat ? " matcher" : ""}</span>
        {hiddenSelected.length > 0 && (
          <button type="button" onClick={() => { setQ(""); setCat(null); }} className="min-h-9 rounded-md border border-accent/40 bg-accent/10 px-2.5 font-medium text-foreground hover:bg-accent/20">
            {hiddenSelected.length} valgt skjult af søgning · Vis alle
          </button>
        )}
      </div>
      <div className="space-y-3">
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">Ingen services matcher din søgning.</p>
        )}
        {groups.map(([group, list]) => (
          <section key={group} className="space-y-2">
            {(group === "Mest brugt" || (categories.length > 1 && !cat)) && (
              <h4 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
            )}
            <ul className="space-y-1.5">
              {list.map((s) => {
                const steps = [...(s.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                const intervals = s.interval_options?.length ? s.interval_options : ["engangskøb"];
                const varenr = productNumbers?.get(s.id);
                const selected = selectedIds.includes(s.id);
                const open = openId === s.id;
                const hasDetails = steps.length > 0 || !!s.description;
                const isEnter = enterTarget === s.id;
                return (
                  <li key={s.id} id={`svc-row-${s.id}`}
                    className={cn("min-w-0 scroll-mt-4 overflow-hidden rounded-lg border bg-background transition-colors",
                      selected ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30" : isEnter ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-foreground/25")}>
                    <div className="flex min-w-0 items-center gap-2 px-2.5 py-1.5">
                      <IndustryIcon category={s.service_category} subcategory={s.subcategory ?? undefined} name={s.name} className="h-6 w-6 shrink-0 self-start mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                          <p className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground"><Hl text={s.name} q={q} /></p>
                          <p className="shrink-0 text-xs font-bold tabular-nums text-foreground">{priceLine(s)} <span className="font-normal text-muted-foreground">uden moms</span></p>
                        </div>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                          {intervals.length === 1 ? (
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", intervals[0] === "engangskøb" ? "bg-secondary text-secondary-foreground" : "bg-accent/15 text-foreground")}>
                              {intervals[0] !== "engangskøb" && <Repeat className="h-3 w-3 text-accent" />}{intervalLabel(intervals[0])}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-foreground" title={intervals.map(intervalLabel).join(", ")}>
                              <Repeat className="h-3 w-3 text-accent" />{intervals.length} intervaller
                            </span>
                          )}
                          {integration && (
                            <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] tabular-nums",
                              varenr ? "border-border text-muted-foreground" : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200")}>
                              <Hash className="h-3 w-3" />{varenr ? varenr : "Intet varenr."}
                            </span>
                          )}
                          {isEnter && <span className="hidden text-[11px] font-medium text-accent sm:inline">Enter for at tilføje</span>}
                        </div>
                        {(steps.length > 0 || s.description) && !open && (
                          <p className="mt-0.5 line-clamp-1 break-words text-xs leading-5 text-muted-foreground">
                            {steps.length > 0 ? steps.map((c) => `${c.label} ${formatPrice(c.price_per_unit)}/${c.unit}`).join(" · ") : s.description}
                          </p>
                        )}
                      </div>
                      {hasDetails && (
                        <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open} aria-label={open ? `Skjul detaljer for ${s.name}` : `Vis detaljer for ${s.name}`}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60 text-foreground hover:bg-secondary sm:h-9 sm:w-9">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                        </button>
                      )}
                      {selected ? (
                        <button type="button" onClick={() => onRemove(s.id)} aria-pressed="true" aria-label={`${s.name} er valgt — tryk for at fjerne`}
                          className="inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-accent bg-accent/15 px-2.5 text-sm font-semibold text-foreground hover:bg-accent/25 sm:h-9">
                          <Check className="h-4 w-4 text-accent" />Valgt
                        </button>
                      ) : (
                        <button type="button" onClick={() => onAdd(s.id)} aria-label={`Tilføj ${s.name}`}
                          className="inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 sm:h-9">
                          <Plus className="h-4 w-4" />Tilføj
                        </button>
                      )}
                    </div>
                    {open && (
                      <div className="space-y-1.5 border-t border-border px-3 py-2 text-xs leading-5 text-muted-foreground sm:pl-12">
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
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-1 lg:hidden">
          <div className="rounded-t-xl border border-accent/40 bg-card shadow-lg">
            <button type="button" onClick={() => setTrayOpen((v) => !v)} aria-expanded={trayOpen}
              className="flex min-h-12 w-full items-center gap-2 px-3 text-left">
              <Check className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">Valgte ({selectedIds.length}){summaryAmount ? <> · {summaryAmount}</> : null}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !trayOpen && "rotate-180")} />
            </button>
            {trayOpen && <div className="max-h-[50dvh] overflow-y-auto border-t border-border p-2">{selectedList(true)}</div>}
          </div>
        </div>
      )}
    </div>
    <aside className="hidden min-w-0 lg:sticky lg:top-0 lg:block lg:self-start" aria-label="Valgte services">
      <div className="mb-2 flex items-baseline justify-between gap-2"><h4 className="text-sm font-semibold text-foreground">Valgte services</h4>{selectedIds.length > 0 && <span className="text-xs text-muted-foreground">{summary}</span>}</div>
      {selectedIds.length === 0 ? (
        <p className="rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-6 text-center text-sm text-muted-foreground">Tryk «Tilføj» ved en service. Interval, antal/felter og opstartsdato vælges her.</p>
      ) : (
        <div className="lg:max-h-[calc(92vh-12rem)] lg:overflow-y-auto lg:pr-1">{selectedList(false)}</div>
      )}
    </aside>
    </div>
  );
}
