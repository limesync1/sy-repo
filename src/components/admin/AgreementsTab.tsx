import { useMemo, useState } from "react";
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
import { useServices } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  Trash2, Pencil, RefreshCw, Receipt,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { toast } from "sonner";

const STATUS_CONFIG: Record<AgreementStatus, { label: string; cls: string }> = {
  draft:            { label: "Kladde",    cls: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Afventer godkendelse", cls: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200" },
  active:           { label: "Aktiv",     cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200" },
  paused:           { label: "Sat på pause", cls: "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200" },
  ended:            { label: "Afsluttet", cls: "bg-secondary text-foreground" },
  cancelled:        { label: "Annulleret", cls: "bg-destructive/10 text-destructive" },
};

type Props = {
  businessId: string;
  businessName: string;
};

const fmtDate = (d?: string | null) => (d ? format(parseISO(d), "d. MMM yyyy", { locale: da }) : "—");

const useBusinessCustomers = (businessId: string) => useQuery({
  queryKey: ["business-customers-mini", businessId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("business_customers")
      .select("id, company_name, contact_name, email, phone, address, zip_code, city, latitude, longitude, cvr")
      .eq("business_id", businessId)
      .order("company_name");
    if (error) throw error;
    return data || [];
  },
});

const AgreementsTab = ({ businessId, businessName }: Props) => {
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: agreements = [], isLoading } = useAgreements(businessId, statusFilter);
  const ensure = useEnsureOccurrences();
  const enqueueMonthly = useEnqueueMonthlyInvoices();

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
      <PageHeader
        title="Aftaler"
        description="Serier af besøg pr. kunde — én aftale udfolder sig automatisk i kalender og regnskab."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMonthly} disabled={enqueueMonthly.isPending}>
              {enqueueMonthly.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1.5" />}
              Samlefaktura forrige måned
            </Button>
            <Button variant="outline" size="sm" onClick={handleEnsure} disabled={ensure.isPending}>
              {ensure.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Generér forekomster
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Ny aftale
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Alle ({counts.all || 0})</TabsTrigger>
            <TabsTrigger value="active">Aktive ({counts.active || 0})</TabsTrigger>
            <TabsTrigger value="pending_approval">Afventer ({counts.pending_approval || 0})</TabsTrigger>
            <TabsTrigger value="paused">Pause ({counts.paused || 0})</TabsTrigger>
            <TabsTrigger value="ended">Afsluttede ({counts.ended || 0})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg kunde..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8" />}
          title="Ingen aftaler endnu"
          description="Opret din første aftale — fast kunde, service og interval. Resten kører automatisk."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Opret aftale</Button>}
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
        {tpl && <span className="h-10 w-1 rounded-full" style={{ background: tpl.color }} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">
              {agreement.company_name || agreement.customer_name}
            </p>
            <Badge variant="secondary" className={status.cls}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{INTERVAL_LABELS[agreement.interval]}</span>
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Start {fmtDate(agreement.start_date)}</span>
            {tpl && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{tpl.name}</span>}
            {!tpl && <span className="text-amber-700 dark:text-amber-400">Ingen rute</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold tabular-nums">{Math.round(Number(agreement.total_amount || 0))} kr</p>
          <p className="text-xs text-muted-foreground">pr. besøg</p>
        </div>
      </div>
    </Card>
  );
};

/* ─── Create dialog ─── */
const CreateAgreementDialog = ({
  businessId, open, onOpenChange,
}: { businessId: string; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { data: customers = [] } = useBusinessCustomers(businessId);
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
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState("");

  const customer = customers.find((c) => c.id === customerId);
  const service = services.find((s) => s.id === serviceId);

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    if (s) {
      setPrice(String(s.base_price ?? 0));
      if ((s as any).estimated_duration_minutes) setDuration(String((s as any).estimated_duration_minutes));
    }
  };

  const canSave = !!customer && !!service && !!startDate;

  const handleSave = async () => {
    if (!customer || !service) return;
    const totalPrice = Number(price) || 0;
    await create.mutateAsync({
      business_id: businessId,
      business_customer_id: customer.id,
      customer_name: customer.contact_name || customer.company_name,
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
        quantity: 1,
        unit_price: totalPrice,
        total_price: totalPrice,
        details: {},
      }],
    });
    toast.success("Aftale oprettet");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny aftale</DialogTitle>
          <DialogDescription>Vælg kunde og service. Aftalen udfolder sig automatisk efter intervallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Kunde</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder={customers.length === 0 ? "Opret kunder først" : "Vælg kunde"} /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}{c.contact_name ? ` · ${c.contact_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger><SelectValue placeholder="Vælg service" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as AgreementInterval)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERVAL_LABELS) as AgreementInterval[]).map((k) => (
                    <SelectItem key={k} value={k}>{INTERVAL_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pris pr. besøg (kr)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fakturering</Label>
            <Select value={billingModel} onValueChange={(v) => setBillingModel(v as AgreementBillingModel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(BILLING_MODEL_LABELS) as AgreementBillingModel[]).map((k) => (
                  <SelectItem key={k} value={k}>{BILLING_MODEL_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {billingModel === "per_visit"
                ? "Faktura sendes hver gang et besøg markeres udført."
                : "Alle udførte besøg i en måned samles på én faktura — kør 'Samlefaktura forrige måned' eller via cron."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Startdato</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slutdato (valgfri)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Standard-rute</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen (lægges i pool)</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.weekday !== null ? ` · ${WEEKDAY_LABELS[t.weekday]}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Foretrukken starttid</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Varighed (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="fx 45" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Noter (valgfri)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={handleSave} disabled={!canSave || create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Opret aftale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
          <div className="flex items-center gap-2">
            <Badge className={status.cls}>{status.label}</Badge>
            <span className="text-sm text-muted-foreground">{INTERVAL_LABELS[agreement.interval]}</span>
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