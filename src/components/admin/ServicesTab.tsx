// Auto-extracted from src/pages/Admin.tsx for code-splitting.
// This entire module (~1700 lines) loads only when the user opens
// the Services tab in their business panel, removing it from the
// initial /virksomhed chunk.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2,
  Sparkles, Calculator, Wrench, Wand2, Loader2, Check,
  ArrowUp, ArrowDown, Copy, Tag, Receipt, BookOpen, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ImageUpload from "@/components/business/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders,
  useCreateService, useUpdateService, useDeleteService,
  useUpsertCalculatorSteps,
} from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { IntervalBuilder } from "@/components/admin/IntervalBuilder";
import { formatInterval } from "@/lib/interval";
import { PageHeader, PrimaryButton, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton, StatGridSkeleton } from "@/components/admin/shared/Skeletons";
import {
  findIndustry,
  industryIcon,
  stepTemplatesForIndustries,
} from "@/lib/service-taxonomy";

const STEP_TEMPLATES: Record<string, { label: string; steps: Array<{ label: string; unit: string; price_per_unit: number; min_value: number; max_value: number; default_value: number }> }[]> = {
  "Rengøring": [
    { label: "Kontor / erhvervsrengøring", steps: [
      { label: "Støvsugning", unit: "m²", price_per_unit: 5, min_value: 10, max_value: 500, default_value: 50 },
      { label: "Tømning af skraldespande", unit: "stk", price_per_unit: 5, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Aftørring af borde", unit: "stk", price_per_unit: 12, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Gulvvask", unit: "m²", price_per_unit: 8, min_value: 10, max_value: 500, default_value: 50 },
    ]},
    { label: "Privat hjemmerengøring", steps: [
      { label: "Antal rum", unit: "rum", price_per_unit: 80, min_value: 1, max_value: 15, default_value: 4 },
      { label: "Badeværelser", unit: "stk", price_per_unit: 120, min_value: 0, max_value: 5, default_value: 1 },
      { label: "Køkken", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 2, default_value: 1 },
    ]},
    { label: "Vinduespolering", steps: [
      { label: "Vinduer", unit: "stk", price_per_unit: 25, min_value: 1, max_value: 100, default_value: 10 },
      { label: "Franske altandøre", unit: "stk", price_per_unit: 60, min_value: 0, max_value: 20, default_value: 0 },
    ]},
    { label: "Flytterengøring", steps: [
      { label: "Boligstørrelse", unit: "m²", price_per_unit: 15, min_value: 20, max_value: 300, default_value: 80 },
      { label: "Ovn rengøring", unit: "stk", price_per_unit: 200, min_value: 0, max_value: 2, default_value: 1 },
      { label: "Køleskab rengøring", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 3, default_value: 1 },
    ]},
  ],
  "Haveservice": [
    { label: "Græsslåning", steps: [
      { label: "Areal", unit: "m²", price_per_unit: 2, min_value: 50, max_value: 5000, default_value: 200 },
      { label: "Kantklipning", unit: "m", price_per_unit: 5, min_value: 0, max_value: 200, default_value: 20 },
    ]},
    { label: "Hækkeklipning", steps: [
      { label: "Hæklængde", unit: "m", price_per_unit: 40, min_value: 1, max_value: 200, default_value: 10 },
      { label: "Højde", unit: "m", price_per_unit: 30, min_value: 1, max_value: 5, default_value: 2 },
    ]},
  ],
  "Maler": [
    { label: "Vægmaling", steps: [
      { label: "Vægflade", unit: "m²", price_per_unit: 45, min_value: 5, max_value: 500, default_value: 30 },
      { label: "Loftflade", unit: "m²", price_per_unit: 55, min_value: 0, max_value: 200, default_value: 0 },
      { label: "Antal strøg", unit: "stk", price_per_unit: 15, min_value: 1, max_value: 3, default_value: 2 },
    ]},
  ],
  "Håndværker": [
    { label: "Generelt håndværkerarbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 400, min_value: 1, max_value: 40, default_value: 2 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
    ]},
  ],
  "VVS": [
    { label: "VVS-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 500, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
      { label: "Kørsel", unit: "km", price_per_unit: 8, min_value: 0, max_value: 100, default_value: 10 },
    ]},
  ],
  "Elektriker": [
    { label: "El-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Stikkontakter", unit: "stk", price_per_unit: 350, min_value: 0, max_value: 20, default_value: 0 },
      { label: "Lampeudtag", unit: "stk", price_per_unit: 400, min_value: 0, max_value: 20, default_value: 0 },
    ]},
  ],
};

const SERVICE_CATEGORIES: Record<string, Record<string, string[]>> = {
  "Rengøring": {
    "Privatrengøring": ["Hjemmerengøring", "Hovedrengøring", "Flytterengøring"],
    "Erhvervsrengøring": ["Rengøring af kontor", "Gulvrens", "Sanitetsrengøring"],
    "Trappevask": ["Trappevask", "Opgangsrengøring"],
    "Vinduespolering": ["Traditionel vinduespolering", "Vinduespolering med rentvandsanlæg"],
  },
  "Håndværker": {
    "Tømrer": ["Tilbygning", "Tagarbejde", "Altan"],
    "Murer": ["Murværk", "Flisearbejde", "Facaderenovering"],
    "Gulvlægning": ["Trægulv", "Vinylgulv", "Epoxygulv"],
  },
  "Haveservice": {
    "Havevedligehold": ["Græsslåning", "Hækkeklipning", "Ukrudtsbekæmpelse"],
    "Anlægsarbejde": ["Beplantning", "Belægning", "Haveprojekt"],
    "Træfældning": ["Træfældning", "Stubbefræsning", "Beskæring"],
  },
  "Maler": {
    "Indvendig maling": ["Vægmaling", "Loftmaling", "Lakering"],
    "Udvendig maling": ["Facademaling", "Vinduer og døre"],
    "Tapetsering": ["Tapetsering", "Fibervæv"],
  },
  "VVS": {
    "Vandinstallation": ["Vandhane", "Toilet", "Badeværelse"],
    "Varmeinstallation": ["Radiator", "Gulvvarme", "Varmepumpe"],
    "Kloakarbejde": ["Kloakservice", "Afløb", "Drænarbejde"],
  },
  "Elektriker": {
    "Elinstallation": ["Stikkontakter", "Belysning", "Eltavle"],
    "EL-tjek": ["Elftersynsrapport", "Sikkerhedsgennemgang"],
  },
  "Flyttehjælp": {
    "Privat flytning": ["Lokal flytning", "Langdistance flytning"],
    "Erhvervsflytning": ["Kontorflytning", "Lagerflytning"],
  },
  "Sikkerhed": {
    "Alarmsystemer": ["Tyverialarm", "Brandalarm"],
    "Videoovervågning": ["IP-kamera", "Videoovervågning"],
  },
};

/* ─── Services Tab ─── */
const ServicesTab = ({ businessId, business }: { businessId: string; business: any }) => {
  const { data: services, isLoading } = useServices(businessId);
  const { data: orders } = useOrders(businessId);
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Hent regnskabsintegration + vare-links én gang, så hver række kan vise
  // vare-nr og kundegruppe/indtægtskonto uden N+1 kald.
  const [accountingMeta, setAccountingMeta] = useState<{
    provider: string | null;
    productLabel: string;        // fx "Vare-nr"
    groupLabel: string;          // fx "Varegruppe"
    accountLabel: string;        // fx "Indtægtskonto"
    productLinks: Record<string, string>;        // service_id -> external_product_number eller external_id
    productGroups: Record<string, string>;       // id -> name
    incomeAccounts: Record<string, string>;      // id -> name
  }>({ provider: null, productLabel: "Vare-nr", groupLabel: "Varegruppe", accountLabel: "Indtægtskonto", productLinks: {}, productGroups: {}, incomeAccounts: {} });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Hård feature-gate: vis kun regnskabs-info hvis virksomheden har
      // aktiveret integrationen i sine indstillinger.
      const accountingEnabled = !!(business?.settings as any)?.accounting_integration_enabled;
      if (!accountingEnabled) {
        if (!cancelled) setAccountingMeta(m => ({ ...m, provider: null, productLinks: {}, productGroups: {}, incomeAccounts: {} }));
        return;
      }
      const { data: integ } = await supabase
        .from("accounting_integrations" as any)
        .select("provider, is_active")
        .eq("business_id", businessId)
        .maybeSingle();
      const i = integ as any;
      if (!i?.is_active) {
        if (!cancelled) setAccountingMeta(m => ({ ...m, provider: null, productLinks: {}, productGroups: {}, incomeAccounts: {} }));
        return;
      }
      // Provider-specifikke labels så de matcher det integrerede program.
      const labels = i.provider === "economic"
        ? { productLabel: "Varenr", groupLabel: "Varegruppe", accountLabel: "Salgskonto" }
        : { productLabel: "Varenr", groupLabel: "Konto", accountLabel: "Konto" };

      const { data: links } = await supabase
        .from("accounting_product_links" as any)
        .select("service_id, external_product_number, external_id")
        .eq("business_id", businessId)
        .eq("provider", i.provider);
      const productLinks: Record<string, string> = {};
      for (const l of (links as any[]) ?? []) {
        if (l.service_id) productLinks[l.service_id] = l.external_product_number ?? l.external_id ?? "";
      }

      // Hent navngivne grupper/konti fra adapteren — fail-soft så fanen ikke
      // bliver blokeret hvis regnskabs-API'et er nede.
      let productGroups: Record<string, string> = {};
      let incomeAccounts: Record<string, string> = {};
      try {
        const { data } = await supabase.functions.invoke("accounting-list-groups", {
          body: { business_id: businessId },
        });
        const d = data as any;
        for (const g of d?.product_groups ?? []) productGroups[g.id] = g.name;
        for (const a of d?.income_accounts ?? []) incomeAccounts[a.id] = a.name;
      } catch { /* ignore */ }

      if (!cancelled) {
        setAccountingMeta({
          provider: i.provider,
          ...labels,
          productLinks,
          productGroups,
          incomeAccounts,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, business?.settings]);

  const isFocusMode = showForm || editingId !== null;
  const editingService = editingId
    ? (services || []).find((service: any) => service.id === editingId)
    : null;

  // Brancher virksomheden har valgt i Indstillinger — styrer hvad der kan oprettes
  const businessIndustries: string[] =
    (business?.categories as string[]) ||
    (business?.category ? [business.category] : []);
  const hasIndustries = businessIndustries.length > 0;
  // Underkategorier valgt i Indstillinger pr. branche — finkornet styring
  const selectedSubcategoriesByIndustry: Record<string, string[]> =
    ((business?.settings as any)?.selected_subcategories as Record<string, string[]>) || {};

  // Count orders per service
  const orderCountByService: Record<string, number> = {};
  orders?.forEach((o: any) => {
    o.order_items?.forEach((item: any) => {
      if (item.service_id) {
        orderCountByService[item.service_id] = (orderCountByService[item.service_id] || 0) + item.quantity;
      }
    });
  });

  const uniqueCategories = [...new Set((services || []).map((s: any) => s.service_category).filter(Boolean))];
  const filtered = filterCategory
    ? services?.filter((s: any) => s.service_category === filterCategory)
    : services;
  const activeServices = (services || []).filter((s: any) => s.is_active !== false).length;
  const totalOrders = Object.values(orderCountByService).reduce((a, b) => a + b, 0);

  if (isLoading) return (
    <div className="space-y-4">
      <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
      <ListCardSkeleton rows={5} />
    </div>
  );

  return (
    <div className="space-y-5">

      <Dialog open={isFocusMode} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[calc(100dvh-1rem)] overflow-hidden p-0 gap-0 flex flex-col">
          <DialogHeader className="border-b px-4 py-3 text-left sm:px-5 sm:py-4">
            <DialogTitle className="text-base">
              {editingService ? `Rediger ${editingService.name}` : "Ny service"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              {editingService
                ? "Opdater detaljer, pris og intervaller uden at forlade servicekataloget."
                : "Opret servicen i et fokuseret modul — resten af siden dæmpes imens."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-secondary/20 p-4 sm:p-5">
            {showForm && !hasIndustries && (
              <Card className="mb-4 surface-admin rounded-xl border-amber-300 bg-amber-50 shadow-sm">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Vælg jeres brancher først</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Når I har valgt brancher i Indstillinger, ser I kun service-typer der passer til jeres virksomhed.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg">
                    <a href="/virksomhed?tab=settings">Gå til Indstillinger</a>
                  </Button>
                </CardContent>
              </Card>
            )}
            <ServiceForm
              key={editingService?.id || "new"}
              businessId={editingService?.business_id || businessId}
              businessIndustries={businessIndustries}
              selectedSubcategoriesByIndustry={selectedSubcategoriesByIndustry}
              existingService={editingService || undefined}
              onClose={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <PageHeader
        title="Servicekatalog"
        description={`${services?.length || 0} services · ${totalOrders} bestillinger i alt`}
        action={
          <PrimaryButton data-tour="services-create-button" onClick={() => setShowForm(true)} icon={<Plus />}>
            Tilføj service
          </PrimaryButton>
        }
      />

      <div data-tour="services-stats" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Services i alt</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{services?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aktive</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{activeServices}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bestillinger</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{totalOrders}</p>
            </CardContent>
          </Card>
        </div>

        {uniqueCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              onClick={() => setFilterCategory("")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${!filterCategory ? "border-border bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              Alle
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${filterCategory === cat ? "border-border bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {uniqueCategories.length > 1 && (
        <div className="hidden" />
      )}

      <div className="space-y-2" data-tour="services-list">
        {filtered?.map((s: any) => (
          <ServiceRow
            key={s.id}
            service={s}
            orderCount={orderCountByService[s.id] || 0}
            accountingMeta={accountingMeta}
            onEdit={() => setEditingId(s.id)}
            onDelete={() => deleteService.mutate(s.id)}
          />
        ))}
        {(!filtered || filtered.length === 0) && !showForm && (
          <EmptyState
            icon={<Wrench />}
            title={filterCategory ? `Ingen services i "${filterCategory}"` : "Ingen services endnu"}
            description="Tilføj din første service for at komme i gang."
            action={
              <PrimaryButton onClick={() => setShowForm(true)} icon={<Plus />}>
                Tilføj service
              </PrimaryButton>
            }
          />
        )}
      </div>
    </div>
  );
};

type AccountingMeta = {
  provider: string | null;
  productLabel: string;
  groupLabel: string;
  accountLabel: string;
  productLinks: Record<string, string>;
  productGroups: Record<string, string>;
  incomeAccounts: Record<string, string>;
};

const ServiceRow = ({ service, orderCount, accountingMeta, onEdit, onDelete }: {
  service: any;
  orderCount: number;
  accountingMeta?: AccountingMeta;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const pricingLabels: Record<string, string> = { fast_pris: "Specifik pris", timepris: "Timepris", prisberegner: "Prisberegner" };

  const intervals = service.interval_options || [];
  const hasRecurring = intervals.some((i: string) => i !== "engangskøb");
  const categoryIcon = industryIcon(service.service_category);
  const intervalSummary = intervals.length > 0
    ? intervals.slice(0, 2).map((interval: string) => formatInterval(interval)).join(", ") + (intervals.length > 2 ? ` +${intervals.length - 2}` : "")
    : "Ikke angivet";
  const priceSummary = service.base_price != null
    ? `${service.base_price} kr${service.unit ? ` / ${service.unit}` : ""}`
    : service.pricing_type === "prisberegner"
      ? `${service.calculator_steps?.length || 0} trin`
      : "Ikke angivet";

  const isActive = service.is_active !== false;
  const provider = accountingMeta?.provider ?? null;
  const externalNo = provider ? accountingMeta?.productLinks[service.id] : undefined;
  const groupName = provider && service.accounting_product_group
    ? (accountingMeta?.productGroups[service.accounting_product_group] ?? service.accounting_product_group)
    : null;
  const accountId = service.accounting_income_account ?? service.accounting_account_number ?? null;
  const accountName = provider && accountId
    ? (accountingMeta?.incomeAccounts[accountId] ?? accountId)
    : null;
  const providerLabel = provider === "economic" ? "e-conomic" : provider === "dinero" ? "Dinero" : null;

  return (
    <Card className={`surface-admin rounded-lg border-border/80 shadow-sm overflow-hidden transition-colors ${!isActive ? "opacity-70" : "hover:border-foreground/20"}`}>
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="min-w-0 flex-1 p-3 sm:p-3.5">
            {/* Header: ikon + titel + meta + handlinger */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50 text-sm">
                  <span className="leading-none">{categoryIcon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-[13.5px] font-semibold text-foreground">{service.name}</h3>
                    {!isActive && (
                      <Badge variant="outline" className="rounded-md border-destructive/30 px-1.5 py-0 text-[9px] uppercase tracking-wide text-destructive">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                    {service.service_category && (
                      <span className="rounded bg-secondary px-1 py-0 text-[9.5px] font-medium uppercase tracking-wide text-foreground/70">
                        {service.service_category}
                      </span>
                    )}
                    <span className="truncate">{service.subcategory || "Standard service"}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" />
                      {pricingLabels[service.pricing_type] || service.pricing_type}
                    </span>
                    {hasRecurring && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="h-2.5 w-2.5" /> Abonnement
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="sm" onClick={onEdit} className="h-7 rounded-md border-border px-2.5 text-[11px]">
                  Rediger
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Hovedstats — pris stort, resten kompakte celler */}
            <div className="mt-2.5 grid items-stretch gap-1.5 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
              <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums truncate">{priceSummary}</p>
              </div>
              <CompactStat label="Interval" value={intervalSummary} />
              <CompactStat label="Bestillinger" value={orderCount.toString()} numeric />
              <CompactStat
                label="Opsætning"
                value={service.calculator_steps?.length > 0 ? `${service.calculator_steps.length} trin` : "Standard"}
              />
            </div>

            {/* Regnskabsstribe — kun synlig hvis et regnskabsprogram er forbundet */}
            {provider && (
              <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-dashed border-border bg-secondary/30 px-2 py-1">
                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <BookOpen className="h-2.5 w-2.5" /> {providerLabel}
                </span>
                <AccountingChip
                  icon={<Receipt className="h-2.5 w-2.5" />}
                  label={accountingMeta!.productLabel}
                  value={externalNo || "afventer synk"}
                  muted={!externalNo}
                />
                <AccountingChip
                  icon={<Calculator className="h-2.5 w-2.5" />}
                  label={accountingMeta!.accountLabel}
                  value={accountName || "fra gruppe"}
                  muted={!accountName}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Lille genbrugelig stat-celle der matcher resten af admin-fanernes look
const CompactStat = ({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) => (
  <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-0.5 text-[12px] font-medium text-foreground line-clamp-1 ${numeric ? "tabular-nums" : ""}`}>{value}</p>
  </div>
);

// Lille chip til regnskabs-info (vare-nr, gruppe, konto)
const AccountingChip = ({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) => (
  <span className={`inline-flex max-w-full items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] ${muted ? "text-muted-foreground" : "text-foreground"}`}>
    <span className="text-muted-foreground">{icon}</span>
    <span className="font-medium text-muted-foreground">{label}:</span>
    <span className="truncate font-medium">{value}</span>
  </span>
);

/* ─── Calculator Preview ─── */
const CalculatorPreview = ({ steps }: { steps: any[] }) => {
  const [values, setValues] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    steps.forEach((s, i) => { init[i] = parseFloat(s.default_value) || 0; });
    return init;
  });

  const total = steps.reduce((sum, step, i) => sum + (values[i] || 0) * (parseFloat(step.price_per_unit) || 0), 0);
  if (steps.length === 0) return null;

  return (
    <div className="surface-admin rounded-xl border border-border/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Calculator className="h-4 w-4" />
        Forhåndsvisning
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {steps.filter(s => s.label).map((step, idx) => {
          const stepTotal = (values[idx] || 0) * (parseFloat(step.price_per_unit) || 0);
          return (
            <div key={idx} className={`flex items-center justify-between gap-3 px-4 py-3 ${idx < steps.length - 1 ? "border-b border-border" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{step.label || "..."}</div>
                <div className="text-xs text-muted-foreground">{parseFloat(step.price_per_unit) || 0} kr / {step.unit || "stk"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
                  {values[idx] || 0} {step.unit || "stk"}
                </span>
                <span className="w-16 text-right text-sm font-semibold text-foreground">{stepTotal} kr</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between bg-secondary px-4 py-3">
          <span className="text-sm font-semibold text-foreground">I alt</span>
          <span className="text-lg font-bold text-foreground">{total} kr</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Service Form ─── */
const ServiceForm = ({
  businessId,
  businessIndustries = [],
  selectedSubcategoriesByIndustry = {},
  existingService,
  onClose,
}: {
  businessId: string;
  businessIndustries?: string[];
  selectedSubcategoriesByIndustry?: Record<string, string[]>;
  existingService?: any;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { data: business } = useMyBusiness();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const upsertSteps = useUpsertCalculatorSteps();

  const [currentStep, setCurrentStep] = useState(1);
  const formRootRef = useRef<HTMLDivElement>(null);
  // Når brugeren skifter trin scroller vi tilbage til toppen af popuppen,
  // ellers står man midt på det nye trin og ved ikke hvor man er.
  useEffect(() => {
    const root = formRootRef.current;
    if (!root) return;
    let el: HTMLElement | null = root.parentElement;
    while (el) {
      const s = getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      el = el.parentElement;
    }
  }, [currentStep]);
  const [serviceCategory, setServiceCategory] = useState(existingService?.service_category || "");
  const [subcategory, setSubcategory] = useState(existingService?.subcategory || "");
  const [name, setName] = useState(existingService?.name || "");
  const [description, setDescription] = useState(existingService?.description || "");
  const [imageUrl, setImageUrl] = useState(existingService?.image_url || "");
  const [pricingType, setPricingType] = useState(existingService?.pricing_type || "fast_pris");
  const [basePrice, setBasePrice] = useState(existingService?.base_price?.toString() || "");
  const [unit, setUnit] = useState(existingService?.unit || "");
  const [steps, setSteps] = useState<any[]>(existingService?.calculator_steps || []);
  const [customCategory, setCustomCategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState(false);
  const [intervalOptions, setIntervalOptions] = useState<string[]>(
    existingService?.interval_options || ["engangskøb"]
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescAutoTried, setAiDescAutoTried] = useState(!!existingService?.description);

  // Regnskabsintegration: hvis virksomheden har en aktiv integration, lad
  // brugeren vælge produktgruppe + indtægtskonto her ved oprettelse, så
  // servicen lander det rigtige sted i regnskabsprogrammet.
  const [accountingProductGroup, setAccountingProductGroup] = useState<string>(
    existingService?.accounting_product_group || ""
  );
  const [accountingIncomeAccount, setAccountingIncomeAccount] = useState<string>(
    existingService?.accounting_income_account || existingService?.accounting_account_number || ""
  );
  const [productNumber, setProductNumber] = useState<string>(existingService?.product_number || "");
  const [vatZone, setVatZone] = useState<string>(existingService?.vat_zone || "");
  const [isActive, setIsActive] = useState<boolean>(existingService?.is_active !== false);
  const [defaultEmployeeIds, setDefaultEmployeeIds] = useState<string[]>(
    (existingService?.default_employee_ids && existingService.default_employee_ids.length > 0)
      ? existingService.default_employee_ids
      : (existingService?.default_employee_id ? [existingService.default_employee_id] : []),
  );
  const { data: employeesForDefault = [] } = useEmployees(businessId);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [integrationProvider, setIntegrationProvider] = useState<string | null>(null);
  const [accountingGroups, setAccountingGroups] = useState<{
    product_groups: { id: string; name: string }[];
    income_accounts: { id: string; name: string }[];
    labels?: { product_groups?: string; income_accounts?: string };
  }>({ product_groups: [], income_accounts: [], labels: {} });
  const [accountingDefaults, setAccountingDefaults] = useState<{
    default_product_group?: string; default_income_account?: string;
  }>({});
  const [accountingLoading, setAccountingLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      // Tjek først om regnskabsintegration overhovedet er aktiveret i virksomhedens indstillinger.
      // Hvis ikke, skal vi hverken vise UI'et eller hente data fra regnskabsprogrammet.
      const { data: biz } = await supabase
        .from("businesses")
        .select("settings")
        .eq("id", businessId)
        .maybeSingle();
      const accountingEnabled = !!(biz?.settings as any)?.accounting_integration_enabled;
      if (cancelled || !accountingEnabled) return;

      const { data: integ } = await supabase
        .from("accounting_integrations" as any)
        .select("provider, settings, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled || !integ) return;
      setHasIntegration(true);
      setIntegrationProvider((integ as any).provider);
      const s = (integ as any).settings ?? {};
      setAccountingDefaults({
        default_product_group: s.default_product_group,
        default_income_account: s.default_income_account,
      });
      // Pre-fill med standarder, hvis service ikke selv har valgt
      if (!existingService?.accounting_product_group && s.default_product_group) {
        setAccountingProductGroup(s.default_product_group);
      }
      if (!existingService?.accounting_income_account && !existingService?.accounting_account_number && s.default_income_account) {
        setAccountingIncomeAccount(s.default_income_account);
      }
      // Hent grupper
      setAccountingLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("accounting-list-groups", {
          body: { business_id: businessId },
        });
        if (!cancelled && !error && data) {
          setAccountingGroups({
            product_groups: (data as any).product_groups ?? [],
            income_accounts: (data as any).income_accounts ?? [],
            labels: (data as any).labels ?? {},
          });
        }
      } catch { /* stille fejl */ }
      finally { if (!cancelled) setAccountingLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [businessId, existingService?.id]);

  const generateAiDescription = async () => {
    if (!name.trim()) {
      toast.error("Skriv først et servicenavn");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-service-description", {
        body: {
          serviceName: name.trim(),
          serviceCategory: serviceCategory || null,
          subcategory: subcategory || null,
          pricingType,
          businessName: business?.name || null,
          businessDescription: business?.description || null,
          businessCategories: Array.isArray(business?.categories) ? business?.categories : null,
          businessCity: business?.city || null,
          intervalOptions: Array.isArray(intervalOptions) ? intervalOptions : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = ((data as any)?.description ?? "").trim();
      if (!text) throw new Error("Tomt svar fra AI");
      setDescription(text);
      toast.success("AI-forslag indsat");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke generere forslag");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-foreslå AI-beskrivelse første gang brugeren rammer detaljer-trinnet
  // med navn + kategori valgt og tom beskrivelse.
  useEffect(() => {
    if (
      currentStep === 2 &&
      !existingService &&
      !aiDescAutoTried &&
      !aiLoading &&
      !description.trim() &&
      name.trim().length > 1 &&
      serviceCategory.trim().length > 0
    ) {
      // Lille forsinkelse så brugeren kan nå at se feltet være tomt og ikke føler at AI tager over
      const t = setTimeout(() => {
        setAiDescAutoTried(true);
        generateAiDescription();
      }, 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, name, serviceCategory]);

  // ── Branchefiltrering ──────────────────────────────────────────────
  // Vi viser kun kategorier/underkategorier/forslag som matcher virksomhedens
  // valgte brancher. Hvis der er en eksisterende service med en gammel/custom
  // kategori, beholder vi den så den ikke forsvinder fra valgmulighederne.
  const selectedIndustries = (businessIndustries || []).filter(Boolean);
  const hasIndustrySelection = selectedIndustries.length > 0;

  const matchedIndustries = selectedIndustries
    .map((k) => findIndustry(k))
    .filter((i): i is NonNullable<ReturnType<typeof findIndustry>> => !!i);

  // Kategorier = brancher fra taxonomien + evt. eksisterende kategori (legacy)
  const taxonomyCategoryKeys = matchedIndustries.map((i) => i.key);
  const legacyCategoryKeys = Object.keys(SERVICE_CATEGORIES).filter(
    (k) => selectedIndustries.includes(k) && !taxonomyCategoryKeys.includes(k),
  );
  const existingCategoryKey =
    existingService?.service_category &&
    !taxonomyCategoryKeys.includes(existingService.service_category) &&
    !legacyCategoryKeys.includes(existingService.service_category)
      ? [existingService.service_category]
      : [];
  const categoryOptions = hasIndustrySelection
    ? Array.from(new Set([...taxonomyCategoryKeys, ...legacyCategoryKeys, ...existingCategoryKey]))
    : Object.keys(SERVICE_CATEGORIES);

  // Underkategorier — først fra taxonomien, ellers fra legacy SERVICE_CATEGORIES
  const taxonomyIndustry = findIndustry(serviceCategory);
  // Hvis virksomheden har valgt specifikke underkategorier i Indstillinger,
  // filtrér så vi KUN viser dem her (giver præcis dynamisk filtrering).
  // Faldback: alle underkategorier i branchen.
  const allowedSubsForCategory = selectedSubcategoriesByIndustry[serviceCategory];
  const allTaxonomySubs = taxonomyIndustry?.subcategories.map((s) => s.label) ?? [];
  const filteredTaxonomySubs = allowedSubsForCategory && allowedSubsForCategory.length > 0
    ? allTaxonomySubs.filter((s) => allowedSubsForCategory.includes(s))
    : allTaxonomySubs;
  // Behold eksisterende underkategori, hvis service redigeres med en værdi
  // der ikke længere er i listen
  const subcategoryOptions = taxonomyIndustry
    ? Array.from(new Set([
        ...filteredTaxonomySubs,
        ...(existingService?.subcategory && filteredTaxonomySubs.length > 0 ? [existingService.subcategory] : []),
      ]))
    : serviceCategory && SERVICE_CATEGORIES[serviceCategory]
      ? Object.keys(SERVICE_CATEGORIES[serviceCategory])
      : [];

  // Service-forslag (navne) for valgt underkategori
  const taxonomySubcategory = taxonomyIndustry?.subcategories.find((s) => s.label === subcategory);
  const productSuggestions = taxonomySubcategory
    ? taxonomySubcategory.services
    : serviceCategory && subcategory && SERVICE_CATEGORIES[serviceCategory]?.[subcategory]
      ? SERVICE_CATEGORIES[serviceCategory][subcategory]
      : [];

  // Step-templates: brug den nye branche-baserede liste hvis branchen er kendt,
  // ellers fald tilbage til den lokale STEP_TEMPLATES (legacy keys).
  const taxonomyTemplates = serviceCategory ? stepTemplatesForIndustries([serviceCategory]) : [];
  const availableTemplates = taxonomyTemplates.length > 0
    ? taxonomyTemplates
    : (STEP_TEMPLATES[serviceCategory] || []);

  // ── Skabelon-rangering med altid-godt-foreslag ──────────────────────
  // 1) Tokeniser brugerens valg (underkategori + servicenavn) til søgeord.
  // 2) Score taxonomy-skabeloner efter overlap med både label OG step-labels.
  //    Det fanger fx "ovn" → "Flytterengøring" (har "Ovn rengøring" som trin).
  // 3) Tilføj ALTID generiske fallback-skabeloner (areal/timer/stk) der
  //    bygges dynamisk ud fra kategori-keywords, så brugeren aldrig står
  //    uden et fornuftigt forslag — selv ved custom kategorier.
  const haystack = `${subcategory || ""} ${name || ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // Score: subcategory direct match (+5), keyword overlap (+2 hver), label/step overlap (+1 hver),
  // beskrivelse overlap (+1 hver). Højere score = bedre match.
  const descTokens = (description || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 30);
  const scoreTemplate = (t: { label: string; steps: { label: string }[]; keywords?: string[]; subcategories?: string[] }) => {
    let score = 0;
    // Direkte underkategori-match: stærkest signal
    if (subcategory && t.subcategories?.some((s) => s.toLowerCase() === subcategory.toLowerCase())) {
      score += 5;
    }
    const text = `${t.label} ${t.steps.map((s) => s.label).join(" ")}`.toLowerCase();
    const kwText = (t.keywords || []).join(" ").toLowerCase();
    haystack.forEach((w) => {
      if (kwText.includes(w)) score += 2;
      else if (text.includes(w)) score += 1;
    });
    descTokens.forEach((w) => {
      if (kwText.includes(w)) score += 1;
      else if (text.includes(w)) score += 0.5;
    });
    return score;
  };

  // Generiske fallback-templates — altid relevante, men nedtonede når
  // taxonomien har specifikke forslag.
  const genericTemplates: typeof availableTemplates = (() => {
    const isAreaJob = /(rengør|maler|vask|polering|gulv|tag|facade|isoler|haveservice|græs|areal)/i.test(
      `${serviceCategory} ${subcategory} ${name}`,
    );
    const isHourly = /(reparation|installation|montering|vvs|elektrik|tømrer|smed|service|hjælp)/i.test(
      `${serviceCategory} ${subcategory} ${name}`,
    );
    const list: typeof availableTemplates = [];
    if (isAreaJob) {
      list.push({
        label: "Areal-baseret pris",
        steps: [
          { label: "Antal m²", unit: "m²", price_per_unit: 12, min_value: 10, max_value: 500, default_value: 50 },
          { label: "Tillægsarbejde", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 10, default_value: 0 },
        ],
      });
    }
    if (isHourly || (!isAreaJob && availableTemplates.length === 0)) {
      list.push({
        label: "Timebaseret med materialer",
        steps: [
          { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 20, default_value: 2 },
          { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
          { label: "Kørsel", unit: "km", price_per_unit: 8, min_value: 0, max_value: 100, default_value: 10 },
        ],
      });
    }
    if (list.length === 0) {
      // Allersidste fallback: en simpel "antal × pris" beregner.
      list.push({
        label: "Antal × pris",
        steps: [
          { label: "Antal", unit: "stk", price_per_unit: 100, min_value: 1, max_value: 50, default_value: 1 },
        ],
      });
    }
    return list;
  })();

  // Saml + dedup på label, sorter på score (taxonomy vinder ved lige score).
  const allTemplates = [...availableTemplates, ...genericTemplates].filter(
    (t, i, arr) => arr.findIndex((x) => x.label === t.label) === i,
  );
  const rankedTemplates = allTemplates
    .map((t, i) => ({
      t,
      score: scoreTemplate(t),
      // Taxonomy-skabeloner ranker over generiske ved samme score
      isGeneric: genericTemplates.includes(t),
      i,
    }))
    .sort((a, b) => b.score - a.score || Number(a.isGeneric) - Number(b.isGeneric) || a.i - b.i)
    .map((s) => s.t);

  const bestTemplate = rankedTemplates[0];
  const bestScore = bestTemplate ? scoreTemplate(bestTemplate) : 0;
  // Stærkt match: vi anvender automatisk uden at spørge AI.
  const isStrongMatch = bestScore >= 5;
  // Brugbart match: vi viser "Bedste match" badge.
  const isBestMatch = !!(bestTemplate && rankedTemplates.length > 1 &&
    (subcategory || name).trim().length > 2 && bestScore > 0);

  const totalSteps = 4;
  const FORM_STEPS = [
    { num: 1, label: "Kategori", color: "bg-blue-500" },
    { num: 2, label: "Detaljer", color: "bg-violet-500" },
    { num: 3, label: "Pris", color: "bg-emerald-500" },
    { num: 4, label: "Interval", color: "bg-cyan-500" },
  ];

  const blankStep = (sortOrder: number) => ({
    label: "",
    unit: "stk",
    price_per_unit: 0,
    min_value: 1,
    max_value: 10,
    default_value: 1,
    sort_order: sortOrder,
  });
  const addStep = () => {
    setSteps((prev) => [...prev, blankStep(prev.length)]);
  };
  const duplicateStep = (i: number) => {
    setSteps((prev) => {
      const copy = { ...prev[i], label: `${prev[i].label || `Trin ${i + 1}`} (kopi)` };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next.map((s, idx) => ({ ...s, sort_order: idx }));
    });
  };
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, sort_order: idx }));
    });
  };
  const startFromScratch = () => {
    setSteps([blankStep(0)]);
  };
  const updateStep = (i: number, field: string, value: any) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: value };
    setSteps(updated);
  };
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const applyTemplate = (template: typeof availableTemplates[number]) => {
    setSteps(template.steps.map((s, i) => ({ ...s, sort_order: i })));
    toast.success(`Skabelon "${template.label}" anvendt`);
  };

  // ── AI-genereret prisberegner-skabelon ──────────────────────────────
  // Kalder edge-funktionen `generate-calculator-template`, som bygger
  // 2-5 trin specifikt tilpasset denne service (kategori + underkategori
  // + beskrivelse). Resultatet erstatter de nuværende trin.
  const [aiTemplateLoading, setAiTemplateLoading] = useState(false);
  const generateAiTemplate = async (opts?: { silent?: boolean }) => {
    if (!name.trim()) {
      toast.error("Skriv først et servicenavn");
      return;
    }
    setAiTemplateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-calculator-template", {
        body: {
          serviceName: name.trim(),
          serviceCategory: serviceCategory || null,
          subcategory: subcategory || null,
          serviceDescription: description?.trim() || null,
          businessName: business?.name || null,
          businessDescription: business?.description || null,
          businessCategories: Array.isArray(business?.categories) ? business?.categories : null,
          businessCity: business?.city || null,
          intervalOptions: Array.isArray(intervalOptions) ? intervalOptions : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const aiSteps = ((data as any)?.steps ?? []) as any[];
      if (!Array.isArray(aiSteps) || aiSteps.length === 0) throw new Error("AI returnerede ingen trin");
      setSteps(aiSteps.map((s, i) => ({ ...s, sort_order: i })));
      if (!opts?.silent) toast.success("AI-skabelon genereret ud fra din beskrivelse");
      else toast.success("AI byggede en skræddersyet prisberegner til dig");
    } catch (e: any) {
      if (!opts?.silent) toast.error(e?.message || "Kunne ikke generere AI-skabelon");
      else console.warn("Auto-AI-skabelon fejlede:", e?.message);
    } finally {
      setAiTemplateLoading(false);
    }
  };

  // Auto-anvendelse er bevidst fjernet: brugeren skal selv vælge mellem
  // skabelon, AI-genereret skabelon eller "byg fra bunden" — vi tager
  // ingen beslutninger på vegne af dem.

  const canGoNext = () => {
    if (currentStep === 1) return !!serviceCategory;
    if (currentStep === 2) return !!name.trim();
    if (currentStep === 3) {
      if (pricingType === "prisberegner") return true;
      return true;
    }
    return true;
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Indtast et servicenavn"); return; }
    if (!serviceCategory.trim()) { toast.error("Vælg en kategori"); return; }
    if (pricingType === "prisberegner" && steps.length === 0) { toast.error("Tilføj mindst ét beregnertrin"); return; }
    if (pricingType === "prisberegner" && steps.some(s => !s.label.trim())) { toast.error("Alle beregnertrin skal have et navn"); return; }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        pricing_type: pricingType as any,
        base_price: basePrice ? parseFloat(basePrice) : null,
        unit: unit || null,
        subcategory: subcategory.trim() || null,
        service_category: serviceCategory.trim() || null,
        image_url: imageUrl || null,
        interval_options: intervalOptions.length > 0 ? intervalOptions : ["engangskøb"],
        accounting_product_group: accountingProductGroup || null,
        accounting_income_account: accountingIncomeAccount || null,
        product_number: productNumber.trim() || null,
        vat_zone: vatZone || null,
        is_active: isActive,
        default_employee_id: defaultEmployeeIds[0] || null,
        default_employee_ids: defaultEmployeeIds,
      };

      if (existingService) {
        await updateService.mutateAsync({ id: existingService.id, ...payload } as any);
        if (pricingType === "prisberegner") {
          await upsertSteps.mutateAsync({
            serviceId: existingService.id,
            steps: steps.map((s, i) => ({
              service_id: existingService.id, label: s.label, unit: s.unit,
              price_per_unit: parseFloat(s.price_per_unit) || 0,
              min_value: parseFloat(s.min_value) || 0,
              max_value: parseFloat(s.max_value) || 100,
              default_value: parseFloat(s.default_value) || 0, sort_order: i,
            })),
          });
        }
        toast.success("Service opdateret");
      } else {
        const result = await createService.mutateAsync({ business_id: businessId, ...payload } as any);
        if (pricingType === "prisberegner" && steps.length > 0) {
          await upsertSteps.mutateAsync({
            serviceId: result.id,
            steps: steps.map((s, i) => ({
              service_id: result.id, label: s.label, unit: s.unit,
              price_per_unit: parseFloat(s.price_per_unit) || 0,
              min_value: parseFloat(s.min_value) || 0,
              max_value: parseFloat(s.max_value) || 100,
              default_value: parseFloat(s.default_value) || 0, sort_order: i,
            })),
          });
        }
        toast.success("Service oprettet");
      }
      onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  const CATEGORY_ICONS: Record<string, string> = {
    "Rengøring": "🧹", "Håndværker": "🔨", "Flyttehjælp": "📦", "Haveservice": "🌿",
    "Maler": "🎨", "VVS": "🔧", "Elektriker": "⚡", "Sikkerhed": "🔒",
  };

  return (
    <div className="space-y-6">
      {/* Step Progress Bar — kompakt, tydelig nuværende fase + lille hint
          om hvad der mangler i alt. */}
      <div className="surface-admin rounded-xl border border-border/80 p-3 sm:p-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trin {currentStep} af {totalSteps}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {FORM_STEPS[currentStep - 1]?.label}
            </p>
          </div>
          {/* Live opsummering af brugerens valg så de altid kan se hvor de er */}
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5">
            {serviceCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                <span>{CATEGORY_ICONS[serviceCategory] || "📋"}</span>
                {serviceCategory}
              </span>
            )}
            {subcategory && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                {subcategory}
              </span>
            )}
            {name.trim() && currentStep > 2 && (
              <span className="max-w-[180px] truncate rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                {name.trim()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {FORM_STEPS.map((s, i) => {
            const isLast = i === FORM_STEPS.length - 1;
            const isDone = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div key={s.num} className={`flex items-center ${isLast ? "shrink-0" : "flex-1"}`}>
                <button
                  type="button"
                  onClick={() => { if (s.num <= currentStep || canGoNext()) setCurrentStep(s.num); }}
                  className="group flex shrink-0 items-center gap-2"
                  title={s.label}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isCurrent ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/15" :
                    isDone ? "bg-foreground/90 text-background" : "bg-secondary text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : s.num}
                  </span>
                </button>
                {!isLast && (
                  <div className={`mx-2 h-0.5 flex-1 min-w-4 rounded-full transition-colors ${
                    FORM_STEPS[i + 1].num <= currentStep ? "bg-foreground/60" : "bg-border"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Category — Card grid instead of dropdown */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Vælg kategori</h4>
            <p className="mt-1 text-sm text-muted-foreground">Hvilken type service tilbyder du?</p>
          </div>

          {!customCategory ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {categoryOptions.map((c) => (
                  <button key={c} type="button"
                    onClick={() => { setServiceCategory(c); setSubcategory(""); setCustomSubcategory(false); }}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors ${
                      serviceCategory === c
                        ? "border-border bg-secondary"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{CATEGORY_ICONS[c] || "📋"}</span>
                    <span className="text-sm font-medium text-foreground">{c}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setCustomCategory(true); setServiceCategory(""); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                + Skriv din egen kategori
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Fx Vinduespolering" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="bg-card" />
              <button type="button" onClick={() => { setCustomCategory(false); setServiceCategory(""); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                ← Vælg fra listen
              </button>
            </div>
          )}

          {/* Subcategory — chips instead of dropdown */}
          {serviceCategory && subcategoryOptions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Underkategori</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">Vælg den mest passende underkategori</p>
              </div>
              {!customSubcategory ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {subcategoryOptions.map((s) => (
                      <button key={s} type="button" onClick={() => setSubcategory(s)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          subcategory === s
                            ? "border-accent bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/30"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        {subcategory === s && <Check className="h-3.5 w-3.5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setCustomSubcategory(true); setSubcategory(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    + Skriv din egen
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-card" />
                  <button type="button" onClick={() => { setCustomSubcategory(false); setSubcategory(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    ← Vælg fra listen
                  </button>
                </div>
              )}
            </div>
          )}

          {serviceCategory && subcategoryOptions.length === 0 && !customCategory && (
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Underkategori (valgfrit)</label>
              <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-card" />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Service detaljer</h4>
            <p className="mt-1 text-sm text-muted-foreground">Beskriv din service så kunderne ved hvad de får</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Servicenavn</label>
            <Input placeholder="Fx Rengøring af kontor" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-11 text-base" />
            {productSuggestions.length > 0 && !name && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground mr-1">Forslag:</span>
                {productSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Beskrivelse</label>
            <Textarea
              placeholder={aiLoading ? "AI skriver et forslag baseret på servicenavnet…" : "Hvad inkluderer denne service? Hvad kan kunden forvente?"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card disabled:opacity-70 disabled:cursor-wait"
              rows={3}
              disabled={aiLoading}
              readOnly={aiLoading}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={generateAiDescription}
                disabled={aiLoading || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                title={!name.trim() ? "Skriv et servicenavn først" : "Generér forslag baseret på din virksomhed"}
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {aiLoading ? "Genererer…" : "Foreslå beskrivelse med AI"}
              </button>
              <p className="text-[11px] text-muted-foreground">AI bruger jeres navn, branche og beskrivelse.</p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Billede (valgfrit)</label>
            <ImageUpload folder={`${user!.id}/services`} currentUrl={imageUrl || null} onUploaded={setImageUrl} label="" aspectRatio="aspect-video" className="w-40" />
          </div>
        </div>
      )}

      {/* Step 3: Pricing — big cards */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Hvordan vil du prissætte?</h4>
            <p className="mt-1 text-sm text-muted-foreground">Vælg den prismodel der passer bedst til din service</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: "fast_pris", label: "Specifik pris", desc: "Kunden betaler én specifik pris for hele servicen", icon: "💰" },
              { value: "timepris", label: "Timepris", desc: "Kunden betaler pr. time brugt på opgaven", icon: "⏱️" },
              { value: "prisberegner", label: "Prisberegner", desc: "Kunden sammensætter selv og ser prisen live", icon: "🧮" },
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => setPricingType(opt.value)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  pricingType === opt.value
                    ? "border-border bg-secondary"
                    : "border-border bg-card hover:bg-secondary"
                }`}>
                <span className="text-2xl">{opt.icon}</span>
                <span className="mt-2 block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground leading-snug">{opt.desc}</span>
              </button>
            ))}
          </div>

          {(pricingType === "fast_pris" || pricingType === "timepris") && (
            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {pricingType === "fast_pris" ? "Pris (kr)" : "Timepris (kr)"}
                  <span className="ml-1 text-destructive">*</span>
                </label>
                <Input type="number" placeholder="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="bg-card h-11 text-base" />
              </div>
            </div>
          )}

          {pricingType === "prisberegner" && (
            <div className="space-y-5 pt-2">
              <div>
                <h4 className="text-base font-semibold text-foreground">Opsæt prisberegner</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Du bestemmer: vælg en skabelon, lad AI bygge en til dig — eller byg trinnene manuelt fra bunden.
                </p>
              </div>

              {steps.length === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => generateAiTemplate()}
                    disabled={aiTemplateLoading || !name.trim()}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-foreground/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {aiTemplateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {aiTemplateLoading ? "AI bygger din beregner…" : "Lad AI bygge prisberegneren"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Skræddersyet til {subcategory || serviceCategory || "din service"} på få sekunder.
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={startFromScratch}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-foreground/40 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Byg fra bunden</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Start med ét tomt trin og tilpas alt selv.
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {rankedTemplates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        {steps.length === 0 ? "Foreslåede skabeloner" : "Skift skabelon"}
                      </span>
                      {aiTemplateLoading && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> AI tilpasser…
                        </span>
                      )}
                    </div>
                    {(subcategory || serviceCategory) && (
                      <span className="text-[11px] text-muted-foreground">
                        Tilpasset {subcategory || serviceCategory}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rankedTemplates.slice(0, 3).map((t, idx) => {
                      const isBest = idx === 0 && isBestMatch;
                      return (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          className={`group relative flex flex-col rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/50 hover:shadow-md ${
                            isBest ? "border-foreground/70 ring-1 ring-foreground/10" : "border-border"
                          }`}
                        >
                          {isBest && (
                            <span className="absolute -top-2 left-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
                              Bedste match
                            </span>
                          )}
                          <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {t.steps.length} trin · {Array.from(new Set(t.steps.map((s) => s.unit))).join(", ")}
                          </span>
                          <span className="mt-2 block text-xs text-muted-foreground/80 line-clamp-2">
                            {t.steps.slice(0, 3).map((s) => s.label).join(" · ")}
                            {t.steps.length > 3 ? " …" : ""}
                          </span>
                          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 group-hover:text-foreground">
                            Brug skabelon →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={startFromScratch}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-card hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Byg selv fra bunden — uden skabelon
                  </button>
                </div>
              )}

          <div className="space-y-3">
            {steps.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {steps.length} {steps.length === 1 ? "trin" : "trin"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · Standardpris{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {steps.reduce(
                        (sum, s) => sum + (Number(s.price_per_unit) || 0) * (Number(s.default_value) || 0),
                        0,
                      ).toLocaleString("da-DK")} kr
                    </span>
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5 rounded-lg">
                  <Plus className="h-3.5 w-3.5" /> Tilføj trin
                </Button>
              </div>
            )}

            {steps.map((step, i) => {
              const rowTotal = (Number(step.price_per_unit) || 0) * (Number(step.default_value) || 0);
              return (
                 <Card key={i} className="group/step rounded-xl shadow-sm border-border overflow-hidden transition-colors hover:border-foreground/15">
                   <div className="flex items-center justify-between gap-2 bg-secondary/50 px-3 py-2 border-b border-border">
                     <div className="flex items-center gap-2 min-w-0">
                       <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-bold text-background">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {step.label || `Trin ${i + 1}`}
                      </span>
                      {rowTotal > 0 && (
                        <span className="ml-1 shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 tabular-nums">
                          {rowTotal.toLocaleString("da-DK")} kr
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
                        <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}
                          aria-label="Flyt op" title="Flyt op"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                          aria-label="Flyt ned" title="Flyt ned"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => duplicateStep(i)}
                          aria-label="Dupliker trin" title="Dupliker"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeStep(i)}
                        aria-label="Slet trin" title="Slet trin"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Navn</label>
                        <Input placeholder="Fx Boligens størrelse" value={step.label}
                          onChange={(e) => updateStep(i, "label", e.target.value)} className="bg-card" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Enhed</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"].map((u) => (
                            <button key={u} type="button" onClick={() => updateStep(i, "unit", u)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                                step.unit === u
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                              }`}>{u}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: `Pris / ${step.unit || "enhed"}`, hint: "kr", field: "price_per_unit", value: step.price_per_unit },
                        { label: "Minimum", hint: step.unit, field: "min_value", value: step.min_value },
                        { label: "Maksimum", hint: step.unit, field: "max_value", value: step.max_value },
                        { label: "Standard", hint: step.unit, field: "default_value", value: step.default_value },
                      ].map((f) => (
                        <div key={f.field}>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {f.label}
                          </label>
                          <div className="relative">
                            <Input type="number" inputMode="numeric" placeholder="0" value={f.value}
                              onChange={(e) => updateStep(i, f.field, e.target.value)}
                              className="bg-card text-sm pr-9 tabular-nums" />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                              {f.hint}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {steps.length === 0 && (
              <button type="button" onClick={startFromScratch}
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-10 text-center transition-colors hover:border-foreground/40 hover:bg-secondary/40">
                <Calculator className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-foreground">Opret dit første trin</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {rankedTemplates.length > 0 ? "Eller vælg en skabelon ovenfor" : "Tilføj fx areal, antal rum eller timer"}
                </p>
              </button>
            )}
          </div>

          <CalculatorPreview steps={steps} />
            </div>
          )}
        </div>
      )}

      {/* Step: Interval */}
      {currentStep === totalSteps && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Engangskøb eller abonnement</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Vælg om servicen skal kunne købes som <span className="font-medium text-foreground">engangskøb</span> (uden abonnement), som <span className="font-medium text-foreground">abonnement</span> med faste intervaller, eller begge dele. Du kan tilføje flere intervaller (fx ugentlig + månedlig) og bestemme rækkefølgen.
            </p>
          </div>
          <IntervalBuilder value={intervalOptions} onChange={setIntervalOptions} />
          {intervalOptions.length === 0 && (
            <p className="text-sm text-destructive">Vælg mindst ét interval</p>
          )}

          {/* Status: aktiv/inaktiv */}
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Service er aktiv</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inaktive services vises ikke for kunder og kan ikke bestilles.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? "bg-foreground" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Standard-medarbejdere — automatisk tildeles aftaler oprettet med denne service */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Standard-medarbejdere</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Når en aftale oprettes med denne service, tildeles disse medarbejdere automatisk. Du kan altid ændre eller tilføje flere på den enkelte aftale uden at det påvirker standardindstillingen.
              </p>
            </div>
            {(employeesForDefault as any[]).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Ingen medarbejdere oprettet endnu.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(employeesForDefault as any[]).map((e) => {
                  const selected = defaultEmployeeIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() =>
                        setDefaultEmployeeIds((prev) =>
                          prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id],
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {selected && <span aria-hidden>✓</span>}
                      {e.avatar_url ? (
                        <img
                          src={e.avatar_url}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover -ml-1"
                          width={20}
                          height={20}
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="h-5 w-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white -ml-1"
                          style={{ background: e.color || "hsl(220 13% 46%)" }}
                          aria-hidden
                        >
                          {e.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      )}
                      <span>{e.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {defaultEmployeeIds.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Ingen valgt — medarbejdere skal vælges manuelt på hver aftale.</p>
            )}
          </div>

          {/* Regnskabs-felter på service: vare-nr og momszone */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Regnskabsfelter</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bruges når denne service synkroniseres til dit regnskabsprogram (e-conomic, Dinero).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Vare-/produktnummer (valgfrit)</label>
                <Input
                  placeholder="Fx 1001"
                  value={productNumber}
                  onChange={(e) => setProductNumber(e.target.value)}
                  className="bg-card"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lad stå tom for at lade regnskabsprogrammet tildele et nummer automatisk.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Momszone</label>
                <Select value={vatZone || "__default__"} onValueChange={(v) => setVatZone(v === "__default__" ? "" : v)}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="Brug standard" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Brug standard fra regnskab</SelectItem>
                    <SelectItem value="domestic">Indland (DK moms)</SelectItem>
                    <SelectItem value="eu">EU</SelectItem>
                    <SelectItem value="export">Eksport (uden for EU)</SelectItem>
                    <SelectItem value="exempt">Momsfri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {hasIntegration && (
            <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Regnskab ({integrationProvider})</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Vælg hvor servicen skal bogføres. Du kan altid lade stå tom — så bruges virksomhedens standard.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {accountingGroups.income_accounts.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {accountingGroups.labels?.income_accounts ?? "Indtægtskonto"}
                    </label>
                    <Select
                      value={accountingIncomeAccount || "__default__"}
                      onValueChange={(v) => setAccountingIncomeAccount(v === "__default__" ? "" : v)}
                    >
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Brug standard" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">
                          Brug virksomhedens standard{accountingDefaults.default_income_account ? ` (${accountingGroups.income_accounts.find(a => a.id === accountingDefaults.default_income_account)?.name ?? accountingDefaults.default_income_account})` : ""}
                        </SelectItem>
                        {accountingGroups.income_accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {accountingGroups.income_accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    {accountingLoading ? "Henter konti fra dit regnskabsprogram…" : "Ingen indtægtskonti fundet — sæt en standard på Regnskab-fanen."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="rounded-lg h-10 px-4 text-sm font-medium">
              ← Tilbage
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="rounded-lg h-10 px-4 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:text-foreground">
            Annuller
          </Button>
        </div>
        <div>
          {currentStep < totalSteps ? (
            <Button onClick={() => { if (canGoNext()) setCurrentStep(currentStep + 1); else toast.error("Udfyld venligst de påkrævede felter"); }}
              disabled={!canGoNext()}
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground h-10 px-6 text-sm font-semibold shadow-sm">
              Næste →
            </Button>
          ) : (
            <Button onClick={handleSave} className="rounded-lg bg-foreground text-background hover:bg-foreground/90 h-10 px-6 text-sm font-semibold shadow-sm">
              {existingService ? "Gem ændringer" : "Opret service"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesTab;
