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

