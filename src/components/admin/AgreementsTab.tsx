import { useMemo, useState, type ReactNode } from "react";
import { format, parseISO, isAfter } from "date-fns";
import { da } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useAgreements, useCreateAgreement, useUpdateAgreement, useDeleteAgreement,
  useEnsureOccurrences, useOccurrencesForAgreement,
  useEnqueueMonthlyInvoices,
  INTERVAL_LABELS, BILLING_MODEL_LABELS,
  type Agreement, type AgreementInterval, type AgreementStatus, type AgreementBillingModel,
} from "@/hooks/useAgreements";
import { useRouteTemplates, WEEKDAY_LABELS } from "@/hooks/useRouteTemplates";
import { useServices, type Service, type CalculatorStep } from "@/hooks/useDatabase";
import { INTERVAL_LABELS as SERVICE_INTERVAL_LABELS } from "@/types/service";
import { roundPrice, getSmartStep, buildPricingSnapshot } from "@/lib/service-pricing";
import { useEmployees } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Loader2, Calendar as CalendarIcon, Repeat, MapPin, User,
  Trash2, Pencil, RefreshCw, Receipt, TrendingUp, Clock, AlertCircle, CheckCircle2,
  Package, CreditCard, Users, ArrowRight, Sparkles, Tag, Minus, Calculator, Check,
} from "lucide-react";
import { PageHeader, PrimaryButton, EmptyState } from "@/components/admin/shared/AdminUI";
import { StatusPill, type StatusTone } from "@/components/admin/shared/StatusPill";
import { QuickFilters } from "@/components/admin/shared/QuickFilters";
import { toast } from "sonner";

const STATUS_CONFIG: Record<AgreementStatus, { label: string; tone: StatusTone }> = {
  draft:            { label: "Kladde",              tone: "neutral" },
  pending_approval: { label: "Afventer godkendelse", tone: "warning" },
  active:           { label: "Aktiv",               tone: "success" },
  paused:           { label: "Sat på pause",        tone: "info" },
  ended:            { label: "Afsluttet",           tone: "neutral" },
  cancelled:        { label: "Annulleret",          tone: "danger" },
};

type Props = {
  businessId: string;
  businessName: string;
};

const fmtDate = (d?: string | null) => (d ? format(parseISO(d), "d. MMM yyyy", { locale: da }) : "—");

// Mapping fra service-intervaller → aftale-intervaller. Service-systemet
// understøtter flere granulariteter (10 min, dagligt, hver 8. uge) end aftaler;
// vi viser kun dem der har en aftale-pendant så brugeren ikke vælger noget
// vi ikke kan materialisere på en kalender.
const SERVICE_TO_AGREEMENT_INTERVAL: Record<string, AgreementInterval> = {
  "engangskøb": "engangskøb",
  "ugentlig": "ugentlig",
  "hver_14_dag": "hver_14_dag",
  "hver_4_uge": "hver_4_uge",
  "månedlig": "månedlig",
  "kvartalsvis": "kvartalsvis",
  "halvårlig": "halvårlig",
  "årlig": "årlig",
};

type CustomerOption = {
  id: string;
  type: "business" | "private";
  display_name: string;
  contact_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  cvr: string | null;
};

const useAllCustomers = (businessId: string) => useQuery({
  queryKey: ["agreement-customer-options", businessId],
  queryFn: async (): Promise<CustomerOption[]> => {
    const [bc, pc] = await Promise.all([
      supabase.from("business_customers")
        .select("id, company_name, contact_name, email, phone, address, zip_code, city, latitude, longitude, cvr")
        .eq("business_id", businessId).order("company_name"),
      supabase.from("private_customers")
        .select("id, name, email, phone, address, zip_code, city, latitude, longitude")
        .eq("business_id", businessId).order("name"),
    ]);
    if (bc.error) throw bc.error;
    if (pc.error) throw pc.error;
    const business: CustomerOption[] = (bc.data || []).map((c: any) => ({
      id: c.id, type: "business",
      display_name: c.company_name + (c.contact_name ? ` · ${c.contact_name}` : ""),
      contact_name: c.contact_name, company_name: c.company_name,
      email: c.email, phone: c.phone, address: c.address, zip_code: c.zip_code,
      city: c.city, latitude: c.latitude, longitude: c.longitude, cvr: c.cvr,
    }));
    const priv: CustomerOption[] = (pc.data || []).map((c: any) => ({
      id: c.id, type: "private",
      display_name: c.name,
      contact_name: c.name, company_name: null,
      email: c.email, phone: c.phone, address: c.address, zip_code: c.zip_code,
      city: c.city, latitude: c.latitude, longitude: c.longitude, cvr: null,
    }));
    return [...business, ...priv];
  },
});

// Bulk-hent alle agreement_items for et sæt aftaler i ét kald — undgår
// N+1 queries når listen renderes. Vi grupperer efter agreement_id og
// returnerer { [agreementId]: AgreementItem[] }.
const useAgreementItemsBulk = (agreementIds: string[]) => useQuery({
  queryKey: ["agreement-items-bulk", [...agreementIds].sort().join(",")],
  enabled: agreementIds.length > 0,
  staleTime: 30_000,
  queryFn: async (): Promise<Record<string, { service_id: string | null; service_name: string; total_price: number }[]>> => {
    const { data, error } = await supabase
      .from("agreement_items")
      .select("agreement_id, service_id, service_name, total_price")
      .in("agreement_id", agreementIds);
    if (error) throw error;
    const map: Record<string, any[]> = {};
    (data || []).forEach((it: any) => {
      (map[it.agreement_id] ||= []).push(it);
    });
    return map;
  },
});

const AgreementsTab = ({ businessId, businessName }: Props) => {
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: agreements = [], isLoading } = useAgreements(businessId, statusFilter);
  const { data: allServices = [] } = useServices(businessId);
  const { data: allCustomers = [] } = useAllCustomers(businessId);
  const ensure = useEnsureOccurrences();
  const enqueueMonthly = useEnqueueMonthlyInvoices();

  const hasServices = allServices.length > 0;
  const hasCustomers = allCustomers.length > 0;
  const canCreate = hasServices && hasCustomers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agreements;
    return agreements.filter((a) =>
      a.customer_name.toLowerCase().includes(q) ||
      (a.company_name || "").toLowerCase().includes(q) ||
      (a.customer_email || "").toLowerCase().includes(q),
    );
  }, [agreements, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: agreements.length };
    agreements.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [agreements]);

  // KPI'er — beregnes fra alle aftaler (ikke filtrerede). MRR vurderes ud fra
  // intervallet: hvor mange besøg pr. måned * pris pr. besøg. Engangskøb
  // tæller ikke som tilbagevendende omsætning.
  const kpis = useMemo(() => {
    const visitsPerMonth: Record<AgreementInterval, number> = {
      "engangskøb": 0,
      "ugentlig": 4.33,
      "hver_14_dag": 2.17,
      "hver_4_uge": 1.08,
      "månedlig": 1,
      "kvartalsvis": 1 / 3,
      "halvårlig": 1 / 6,
      "årlig": 1 / 12,
      "custom": 0,
    };
    const active = agreements.filter((a) => a.status === "active");
    const mrr = Math.round(
      active.reduce((s, a) => s + Number(a.total_amount || 0) * (visitsPerMonth[a.interval] ?? 0), 0),
    );
    const in7days = (() => {
      // hurtig estimat: én næste-besøg pr. aktiv aftale med interval i de næste 7 dage.
      // Vi har ikke occurrences her i listen — vi bruger interval som proxy.
      return active.filter((a) => (visitsPerMonth[a.interval] ?? 0) >= 1).length;
    })();
    return [
      {
        label: "Aktive aftaler",
        value: active.length,
        icon: <CheckCircle2 />,
        tone: "success" as const,
        hint: `af ${agreements.length} i alt`,
      },
      {
        label: "MRR (estimat)",
        value: `${mrr.toLocaleString("da-DK")} kr`,
        icon: <TrendingUp />,
        tone: "accent" as const,
        hint: "tilbagevendende pr. måned",
      },
      {
        label: "Næste 7 dage",
        value: in7days,
        icon: <Clock />,
        tone: "info" as const,
        hint: "aftaler med besøg",
      },
      {
        label: "Afventer godkendelse",
        value: counts.pending_approval || 0,
        icon: <AlertCircle />,
        tone: (counts.pending_approval || 0) > 0 ? ("warning" as const) : ("neutral" as const),
        hint: "kræver handling",
      },
    ];
  }, [agreements, counts]);

  const handleEnsure = async () => {
    const until = format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    const inserted = await ensure.mutateAsync({ business_id: businessId, until_date: until });
    toast.success(`${inserted} forekomster genereret`);
  };

  const handleMonthly = async () => {
    const now = new Date();
    // Default: forrige måned (typisk fakturerings-tidspunkt)
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const created = await enqueueMonthly.mutateAsync({
      business_id: businessId,
      year: target.getFullYear(),
      month: target.getMonth() + 1,
    });
    if (created === 0) toast.info("Ingen aftaler med ufakturerede besøg i forrige måned");
    else toast.success(`${created} samlefakturaer sat i kø for ${format(target, "MMMM yyyy", { locale: da })}`);
  };

  return (
    <div className="space-y-4">
      {/* Header — matcher Services-fanens design: stor titel + kort
          beskrivelse + samme PrimaryButton-stil. */}
      <PageHeader
        title="Aftaler"
        description={`${agreements.length} ${agreements.length === 1 ? "aftale" : "aftaler"} · ${(counts.active || 0)} aktive · automatisk kalender, ruter og faktura`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMonthly} disabled={enqueueMonthly.isPending} className="h-9 rounded-lg">
              {enqueueMonthly.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1.5" />}
              Samlefaktura forrige måned
            </Button>
            <Button variant="outline" size="sm" onClick={handleEnsure} disabled={ensure.isPending} className="h-9 rounded-lg">
              {ensure.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Generér forekomster
            </Button>
            <PrimaryButton onClick={() => setCreateOpen(true)} icon={<Plus />} disabled={!canCreate}>
              Ny aftale
            </PrimaryButton>
          </div>
        }
      />

      {/* Stats — samme rytme og typografi som Services-fanen: små
          uppercase-labels, store tabular tal i ren rounded-xl-card. */}
      <div className="grid gap-3 sm:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={i} className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{k.value}</p>
              {k.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forudsætnings-banner: hvis kunde eller service mangler, gør det
          tydeligt hvor man starter. Aftaler giver ikke mening uden begge. */}
      {(!hasCustomers || !hasServices) && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Sådan kommer du i gang med aftaler</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                En aftale binder en <strong>kunde</strong> sammen med en <strong>service</strong> og et interval. Du skal have begge dele før du kan oprette en aftale.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {!hasServices && (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/virksomhed?tab=services">
                      <Package className="h-3.5 w-3.5 mr-1.5" />
                      Opret service <ArrowRight className="h-3 w-3 ml-1.5" />
                    </a>
                  </Button>
                )}
                {!hasCustomers && (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/virksomhed?tab=customers">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Tilføj kunde <ArrowRight className="h-3 w-3 ml-1.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter-rude: status-chips + søgefelt på samme linje */}
      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as AgreementStatus | "all")}
          options={[
            { key: "all", label: "Alle", count: counts.all || 0 },
            { key: "active", label: "Aktive", count: counts.active || 0 },
            { key: "pending_approval", label: "Afventer", count: counts.pending_approval || 0 },
            { key: "paused", label: "Pause", count: counts.paused || 0 },
            { key: "ended", label: "Afsluttet", count: counts.ended || 0 },
          ]}
        />
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg kunde, firma eller email..."
            className="pl-8 h-9 rounded-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8" />}
          title={search ? "Ingen aftaler matcher søgningen" : "Ingen aftaler endnu"}
          description={
            search
              ? "Prøv at rydde søgningen eller skift status-filter."
              : canCreate
                ? "Opret din første aftale — vælg kunde, service og interval. Vi laver kalender-besøg automatisk."
                : "Du mangler enten en kunde eller en service før du kan oprette en aftale."
          }
          action={
            canCreate
              ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Opret aftale</Button>
              : !hasServices
                ? <Button asChild><a href="/virksomhed?tab=services"><Package className="h-3.5 w-3.5 mr-1.5" />Opret første service</a></Button>
                : <Button asChild><a href="/virksomhed?tab=customers"><Users className="h-3.5 w-3.5 mr-1.5" />Tilføj første kunde</a></Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AgreementRow key={a.id} agreement={a} businessId={businessId} onClick={() => setSelectedId(a.id)} />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateAgreementDialog
          businessId={businessId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      {selectedId && (
        <AgreementDetailSheet
          agreementId={selectedId}
          businessId={businessId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

/* ─── Row ─── */
const AgreementRow = ({ agreement, businessId, onClick }: { agreement: Agreement; businessId: string; onClick: () => void }) => {
  const { data: templates = [] } = useRouteTemplates(businessId);
  const tpl = templates.find((t) => t.id === agreement.default_route_template_id);
  const status = STATUS_CONFIG[agreement.status];

  return (
    <Card
      className="p-3 hover:bg-secondary/40 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Farvet sidestripe matcher rute-skemaets farve — visuelt link til
            Ruter-siden hvor samme farve vises i kalenderen. */}
        <span
          className="h-12 w-1 rounded-full shrink-0"
          style={{ background: tpl?.color ?? "hsl(var(--muted))" }}
        />
        {/* Avatar-cirkel med initialer i sammenhængende design med Kunder */}
        <div className="h-9 w-9 shrink-0 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold">
          {(agreement.company_name || agreement.customer_name || "?").trim().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate text-foreground">
              {agreement.company_name || agreement.customer_name}
            </p>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{INTERVAL_LABELS[agreement.interval]}</span>
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Start {fmtDate(agreement.start_date)}</span>
            {tpl ? (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{tpl.name}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <MapPin className="h-3 w-3" />Standardrute
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold tabular-nums text-foreground">{Math.round(Number(agreement.total_amount || 0)).toLocaleString("da-DK")} kr</p>
          <p className="text-[11px] text-muted-foreground">pr. besøg</p>
        </div>
      </div>
    </Card>
  );
};

/* ─── Create dialog ───
   Følger samme tankegang som kunde-bestillingsflowet (DynamicServiceCard):
   1) Vælg kunde og service
   2) Service-typen styrer hvilke felter der vises (fast pris / timepris / prisberegner)
   3) Service-typen styrer også hvilke intervaller man kan vælge
   4) Total beregnes løbende — kan stadig overstyres manuelt */
const CreateAgreementDialog = ({
  businessId, open, onOpenChange,
}: { businessId: string; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { data: customers = [] } = useAllCustomers(businessId);
  const { data: services = [] } = useServices(businessId);
  const { data: templates = [] } = useRouteTemplates(businessId);
  const create = useCreateAgreement();

  const [customerId, setCustomerId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [interval, setInterval] = useState<AgreementInterval>("hver_4_uge");
  const [billingModel, setBillingModel] = useState<AgreementBillingModel>("per_visit");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("__none__");
  const [time, setTime] = useState<string>("08:00");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Pricing-state spejler DynamicServiceCard: timer + step-værdier + manuel override
  const [hours, setHours] = useState<number>(1);
  const [stepValues, setStepValues] = useState<Record<string, number>>({});
  const [priceOverride, setPriceOverride] = useState<string>("");

  const customer = customers.find((c) => c.id === customerId);
  const service = services.find((s) => s.id === serviceId) as (Service & { calculator_steps?: CalculatorStep[] }) | undefined;

  // Tilladte intervaller for den valgte service. Falder tilbage til
  // ["engangskøb"] hvis service ikke definerer noget.
  const allowedIntervals = useMemo<AgreementInterval[]>(() => {
    const opts = service?.interval_options;
    if (!opts || opts.length === 0) return ["engangskøb"];
    const mapped = opts
      .map((o) => SERVICE_TO_AGREEMENT_INTERVAL[o])
      .filter((x): x is AgreementInterval => !!x);
    return mapped.length > 0 ? mapped : ["engangskøb"];
  }, [service]);

  // Sortér calculator-steps på samme måde som booking-kortet
  const sortedSteps = useMemo<CalculatorStep[]>(() => {
    return [...(service?.calculator_steps || [])].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
  }, [service]);

  // Beregnet total ud fra service-typen
  const calculatedTotal = useMemo<number>(() => {
    if (!service) return 0;
    if (service.pricing_type === "fast_pris") return Number(service.base_price || 0);
    if (service.pricing_type === "timepris") return Number(service.base_price || 0) * hours;
    if (service.pricing_type === "prisberegner") {
      return sortedSteps.reduce((sum, s: any) => sum + (stepValues[s.id] || 0) * Number(s.price_per_unit || 0), 0);
    }
    return 0;
  }, [service, hours, stepValues, sortedSteps]);

  const totalPrice = priceOverride.trim() !== "" ? Number(priceOverride) : roundPrice(calculatedTotal);

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const s = services.find((x) => x.id === id) as (Service & { calculator_steps?: CalculatorStep[] }) | undefined;
    if (!s) return;
    // Reset pricing-state til service-defaults
    setPriceOverride("");
    setHours(1);
    const initial: Record<string, number> = {};
    (s.calculator_steps || []).forEach((step: any) => {
      initial[step.id] = step.default_value ?? step.min_value ?? 0;
    });
    setStepValues(initial);
    if ((s as any).estimated_duration_minutes) setDuration(String((s as any).estimated_duration_minutes));
    // Hvis valgte interval ikke er tilladt for ny service → fald tilbage
    const opts = (s.interval_options || ["engangskøb"])
      .map((o) => SERVICE_TO_AGREEMENT_INTERVAL[o])
      .filter((x): x is AgreementInterval => !!x);
    const fallback = opts[0] || "engangskøb";
    setInterval((prev) => (opts.includes(prev) ? prev : fallback));
  };

  const canSave = !!customer && !!service && !!startDate && totalPrice > 0;

  const handleSave = async () => {
    if (!customer || !service) return;
    if (!customer.email) {
      toast.error("Kunden mangler email — tilføj email før aftalen kan oprettes");
      return;
    }
    // Byg item-detaljer der matcher pricing-modellen — så aftalen indeholder
    // samme "snapshot" som en bestilling og kan vises identisk på fakturaen.
    let details: Record<string, unknown> = {};
    let quantity = 1;
    let unitPrice = totalPrice;
    if (service.pricing_type === "timepris") {
      details = { hours, hourly_rate: Number(service.base_price || 0) };
      quantity = hours;
      unitPrice = Number(service.base_price || 0);
    } else if (service.pricing_type === "prisberegner") {
      details = {
        steps: sortedSteps.map((s: any) => ({
          id: s.id, label: s.label, unit: s.unit,
          value: stepValues[s.id] || 0,
          price_per_unit: Number(s.price_per_unit || 0),
          subtotal: roundPrice((stepValues[s.id] || 0) * Number(s.price_per_unit || 0)),
        })),
      };
    }
    const pricingSnapshot = buildPricingSnapshot(service);

    await create.mutateAsync({
      business_id: businessId,
      business_customer_id: customer.type === "business" ? customer.id : null,
      customer_name: customer.contact_name || customer.company_name || customer.display_name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      company_name: customer.company_name,
      cvr: customer.cvr,
      address: customer.address,
      zip_code: customer.zip_code,
      city: customer.city,
      latitude: customer.latitude as any,
      longitude: customer.longitude as any,
      start_date: startDate,
      end_date: endDate || null,
      interval,
      billing_model: billingModel,
      default_route_template_id: templateId === "__none__" ? null : templateId,
      preferred_time_start: time || null,
      estimated_duration_minutes: duration ? Number(duration) : null,
      employee_ids: (service as any).default_employee_ids || [],
      total_amount: totalPrice,
      status: "active",
      notes: notes || null,
      items: [{
        service_id: service.id,
        service_name: service.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        details: { ...details, pricing_snapshot: pricingSnapshot },
      }],
    });
    toast.success("Aftale oprettet");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">Ny aftale</DialogTitle>
          <DialogDescription className="text-xs">
            Vælg kunde og service, justér felterne præcis som kunden ville selv — aftalen kører automatisk fremover.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* ── 1. Kunde ── */}
          <FormSection icon={<User className="h-3.5 w-3.5" />} title="Kunde" step={1}>
            {customers.length === 0 ? (
              <InlineCallout
                title="Ingen kunder endnu"
                description="Tilføj en kunde først, så kan du oprette aftaler for dem."
                action={<Button size="sm" variant="outline" asChild><a href="/virksomhed?tab=customers"><Users className="h-3.5 w-3.5 mr-1.5" />Tilføj kunde</a></Button>}
              />
            ) : (
              <>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Vælg kunde" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={`${c.type}:${c.id}`} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span>{c.display_name}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {c.type === "business" ? "Erhverv" : "Privat"}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customer && (
                  <div className="mt-2 rounded-lg border bg-secondary/40 p-2.5 text-xs space-y-0.5">
                    {customer.address && <p className="text-muted-foreground">📍 {customer.address}{customer.city ? `, ${customer.city}` : ""}</p>}
                    {customer.email && <p className="text-muted-foreground">✉ {customer.email}</p>}
                    {!customer.email && <p className="text-amber-700 dark:text-amber-400">⚠ Mangler email — tilføj før aftalen kan oprettes</p>}
                  </div>
                )}
              </>
            )}
          </FormSection>

          {/* ── 2. Service ── */}
          <FormSection icon={<Package className="h-3.5 w-3.5" />} title="Service" step={2}>
            {services.length === 0 ? (
              <InlineCallout
                title="Ingen services endnu"
                description="En aftale skal indeholde en service — opret en først (fx Privatrengøring 90 min)."
                action={<Button size="sm" variant="outline" asChild><a href="/virksomhed?tab=services"><Package className="h-3.5 w-3.5 mr-1.5" />Opret service</a></Button>}
              />
            ) : (
              <Select value={serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger><SelectValue placeholder="Vælg service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {s.pricing_type === "fast_pris" && `${Math.round(Number(s.base_price || 0))} kr`}
                          {s.pricing_type === "timepris" && `${Math.round(Number(s.base_price || 0))} kr/t`}
                          {s.pricing_type === "prisberegner" && "Prisberegner"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormSection>

          {/* ── 3. Tilpas service (samme felter som kunden ville se) ── */}
          {service && (
            <FormSection icon={<Calculator className="h-3.5 w-3.5" />} title="Tilpas service" step={3}>
              <ServicePricingPanel
                service={service}
                sortedSteps={sortedSteps}
                hours={hours}
                onHoursChange={setHours}
                stepValues={stepValues}
                onStepChange={(id, v) => setStepValues((prev) => ({ ...prev, [id]: v }))}
                calculatedTotal={calculatedTotal}
              />
            </FormSection>
          )}

          {/* ── 4. Interval & planlægning ── */}
          {service && (
            <FormSection icon={<Repeat className="h-3.5 w-3.5" />} title="Interval & planlægning" step={4}>
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hvor ofte?</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {allowedIntervals.map((iv) => (
                      <button
                        key={iv}
                        type="button"
                        onClick={() => setInterval(iv)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          interval === iv
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {INTERVAL_LABELS[iv]}
                      </button>
                    ))}
                  </div>
                  {(service.interval_options || []).length > allowedIntervals.length && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Servicen tilbyder også intervaller (fx daglig) der ikke kan bruges til faste aftaler — vælg et af dem ovenfor.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Startdato</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Slutdato (valgfri)</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Foretrukken starttid</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Varighed (min)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="fx 45" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Standard-rute (valgfri)</Label>
                    <Select value={templateId} onValueChange={setTemplateId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ingen — lægges i pool og kan trækkes ind senere</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.weekday !== null ? ` · ${WEEKDAY_LABELS[t.weekday]}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* ── 5. Pris & fakturering ── */}
          {service && (
            <FormSection icon={<CreditCard className="h-3.5 w-3.5" />} title="Pris & fakturering" step={5}>
              <div className="space-y-3">
                <div className="rounded-xl border border-foreground/10 bg-secondary/40 p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Beregnet pris pr. besøg</p>
                    <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                      {roundPrice(calculatedTotal).toLocaleString("da-DK")} <span className="text-sm font-normal text-muted-foreground">kr</span>
                    </p>
                  </div>
                  <div className="w-32">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Overstyr</Label>
                    <Input
                      type="number"
                      value={priceOverride}
                      onChange={(e) => setPriceOverride(e.target.value)}
                      placeholder={String(roundPrice(calculatedTotal))}
                      className="h-8 text-right tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fakturering</Label>
                  <Select value={billingModel} onValueChange={(v) => setBillingModel(v as AgreementBillingModel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BILLING_MODEL_LABELS) as AgreementBillingModel[]).map((k) => (
                        <SelectItem key={k} value={k}>{BILLING_MODEL_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground rounded-md bg-secondary/40 px-2 py-1.5">
                    {billingModel === "per_visit"
                      ? "💳 Faktura sendes hver gang et besøg markeres udført."
                      : "📅 Alle udførte besøg i en måned samles på én faktura — kør 'Samlefaktura forrige måned' eller via cron."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Noter (valgfri)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Fx nøgle ligger under måtten, hund i huset..." />
                </div>
              </div>
            </FormSection>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-secondary/20 flex sm:items-center sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {service ? (
              <>I alt: <span className="font-semibold text-foreground tabular-nums">{totalPrice.toLocaleString("da-DK")} kr</span> pr. besøg · {INTERVAL_LABELS[interval]}</>
            ) : "Vælg kunde og service for at fortsætte"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!canSave || create.isPending}>
              {create.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Opret aftale
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Pricing-panel (genbrug af kunde-bestillingsflowets logik) ─── */
const ServicePricingPanel = ({
  service, sortedSteps, hours, onHoursChange, stepValues, onStepChange, calculatedTotal,
}: {
  service: Service & { calculator_steps?: CalculatorStep[] };
  sortedSteps: CalculatorStep[];
  hours: number;
  onHoursChange: (v: number) => void;
  stepValues: Record<string, number>;
  onStepChange: (id: string, v: number) => void;
  calculatedTotal: number;
}) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3.5 py-2.5 border-b bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-md text-[10px]">
            {service.pricing_type === "fast_pris" ? "Fast pris" : service.pricing_type === "timepris" ? "Timepris" : "Prisberegner"}
          </Badge>
          {(service as any).subcategory && (
            <span className="text-[11px] text-muted-foreground">{(service as any).subcategory}</span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">Samme felter som kunden ser</span>
      </div>

      <div className="p-3.5 space-y-3">
        {service.pricing_type === "fast_pris" && (
          <p className="text-sm text-muted-foreground">
            Servicen er sat til en fast pris på <span className="font-semibold text-foreground tabular-nums">{Math.round(Number(service.base_price || 0)).toLocaleString("da-DK")} kr</span> pr. besøg.
          </p>
        )}

        {service.pricing_type === "timepris" && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground">Antal timer</p>
              <p className="text-[11px] text-muted-foreground">
                {Number(service.base_price || 0).toLocaleString("da-DK")} kr / time
              </p>
            </div>
            <StepperInput value={hours} onChange={onHoursChange} min={0.5} max={24} step={0.5} unit="t" />
          </div>
        )}

        {service.pricing_type === "prisberegner" && sortedSteps.length === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Servicen er sat op som prisberegner men har ingen trin — gå til Services og tilføj felter (fx m², antal lokaler).
          </p>
        )}

        {service.pricing_type === "prisberegner" && sortedSteps.map((step: any) => {
          const value = stepValues[step.id] ?? step.default_value ?? step.min_value ?? 0;
          const subtotal = roundPrice(value * Number(step.price_per_unit || 0));
          return (
            <div key={step.id} className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {Number(step.price_per_unit || 0).toLocaleString("da-DK")} kr / {step.unit}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StepperInput
                  value={value}
                  onChange={(v) => onStepChange(step.id, v)}
                  min={Number(step.min_value ?? 0)}
                  max={Number(step.max_value ?? 100)}
                  unit={step.unit}
                />
                <span className="text-xs font-semibold tabular-nums text-foreground w-20 text-right shrink-0">
                  {subtotal.toLocaleString("da-DK")} kr
                </span>
              </div>
            </div>
          );
        })}

        {service.pricing_type !== "fast_pris" && (
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">I alt</span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {roundPrice(calculatedTotal).toLocaleString("da-DK")} kr
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Stepper-input (samme look som kunde-bestillingen, lidt strammere) ─── */
const StepperInput = ({
  value, onChange, min, max, step: stepOverride, unit,
}: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string;
}) => {
  const step = stepOverride ?? getSmartStep(unit, min, max);
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  const isLargeRange = (max - min) > 20;
  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center">
        <button type="button" onClick={dec} disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          <Minus className="h-3 w-3" />
        </button>
        {isLargeRange ? (
          <input
            type="number" value={value}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            min={min} max={max} step={step}
            className="h-8 w-16 border-y border-border bg-card px-1 text-center text-xs font-semibold text-foreground outline-none focus:bg-background [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <div className="flex h-8 min-w-[2.5rem] items-center justify-center border-y border-border bg-card px-2 text-xs font-semibold text-foreground tabular-nums">
            {value}
          </div>
        )}
        <button type="button" onClick={inc} disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="text-[11px] text-muted-foreground">{unit}</span>
    </div>
  );
};

/* ─── Form helpers ─── */
const FormSection = ({
  icon, title, step, children,
}: { icon: ReactNode; title: string; step: number; children: ReactNode }) => (
  <section className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="h-5 w-5 shrink-0 rounded-full bg-foreground text-background text-[10px] font-semibold flex items-center justify-center tabular-nums">
        {step}
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
    </div>
    <div className="pl-7">{children}</div>
  </section>
);

const InlineCallout = ({ title, description, action }: { title: string; description: string; action: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 flex items-start gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <div className="shrink-0">{action}</div>
  </div>
);

/* ─── Detail sheet ─── */
const AgreementDetailSheet = ({
  agreementId, businessId, onClose,
}: { agreementId: string; businessId: string; onClose: () => void }) => {
  const { data: agreements = [] } = useAgreements(businessId);
  const agreement = agreements.find((a) => a.id === agreementId);
  const { data: occurrences = [] } = useOccurrencesForAgreement(agreementId);
  const { data: templates = [] } = useRouteTemplates(businessId);
  const update = useUpdateAgreement();
  const remove = useDeleteAgreement();

  if (!agreement) return null;

  const tpl = templates.find((t) => t.id === agreement.default_route_template_id);
  const future = occurrences.filter((o) => isAfter(parseISO(o.occurrence_date), new Date()));
  const status = STATUS_CONFIG[agreement.status];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{agreement.company_name || agreement.customer_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3" />{INTERVAL_LABELS[agreement.interval]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Kunde</p>
              <p>{agreement.customer_name}</p>
              <p className="text-xs text-muted-foreground">{agreement.customer_email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pris pr. besøg</p>
              <p className="font-semibold">{Math.round(Number(agreement.total_amount || 0))} kr</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p>{fmtDate(agreement.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Slut</p>
              <p>{fmtDate(agreement.end_date)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Standard-rute</p>
              <p>{tpl ? tpl.name : "Ingen"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Fakturering</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{BILLING_MODEL_LABELS[agreement.billing_model]}</Badge>
                <Select
                  value={agreement.billing_model}
                  onValueChange={(v) => update.mutate({ id: agreement.id, billing_model: v as AgreementBillingModel })}
                >
                  <SelectTrigger className="h-7 w-auto text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BILLING_MODEL_LABELS) as AgreementBillingModel[]).map((k) => (
                      <SelectItem key={k} value={k}>{BILLING_MODEL_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {agreement.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Noter</p>
              <p className="text-sm whitespace-pre-line">{agreement.notes}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Kommende besøg</h3>
              <span className="text-xs text-muted-foreground">{future.length} planlagt</span>
            </div>
            {future.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen kommende besøg. Tryk "Generér forekomster" på listen.</p>
            ) : (
              <div className="space-y-1.5">
                {future.slice(0, 10).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span>{fmtDate(o.occurrence_date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.route_id ? "På rute" : "Ikke planlagt"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Slet aftale
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slet aftale?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle planlagte besøg slettes. Allerede fakturerede besøg bevares i regnskabet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annullér</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await remove.mutateAsync(agreementId); onClose(); }}>
                    Slet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex items-center gap-2">
              {agreement.status === "active" && (
                <Button variant="outline" size="sm" onClick={() => update.mutate({ id: agreementId, status: "paused" })}>
                  Sæt på pause
                </Button>
              )}
              {agreement.status === "paused" && (
                <Button variant="outline" size="sm" onClick={() => update.mutate({ id: agreementId, status: "active" })}>
                  Genoptag
                </Button>
              )}
              {(agreement.status === "active" || agreement.status === "paused") && (
                <Button variant="outline" size="sm" onClick={() => update.mutate({ id: agreementId, status: "ended", end_date: format(new Date(), "yyyy-MM-dd") })}>
                  Afslut serie
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AgreementsTab;