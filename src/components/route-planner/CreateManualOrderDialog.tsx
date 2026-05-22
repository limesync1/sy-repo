import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServices } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Send, ShoppingBag, User, MessageSquare, Package, Calendar } from "lucide-react";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { roundPrice, buildPricingSnapshot } from "@/lib/service-pricing";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, BadgeCheck } from "lucide-react";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "./SheetSection";
import CustomerEmailAutocomplete from "./CustomerEmailAutocomplete";
import { DatePickerField } from "./DatePickerField";
import { format } from "date-fns";
import { getSubcategoryIcon } from "@/lib/category-icons";

type CalcStep = { id: string; label: string; unit: string; price_per_unit: number; min_value: number | null; max_value: number | null; default_value: number | null; sort_order: number | null };
type Service = { id: string; name: string; description: string | null; pricing_type: "fast_pris" | "timepris" | "prisberegner"; base_price: number | null; unit: string | null; is_active: boolean | null; interval_options: string[] | null; calculator_steps?: CalcStep[]; business_id: string; service_category?: string | null; subcategory?: string | null };

interface BuilderItem {
  serviceId: string;
  service: Service;
  hours: number;
  stepValues: Record<string, number>;
  interval: string;
  /** Opstartsdato pr. service (yyyy-MM-dd). */
  startDate: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(n || 0);

const calcItemTotal = (it: BuilderItem): number => {
  const s = it.service;
  if (s.pricing_type === "fast_pris") return Number(s.base_price || 0);
  if (s.pricing_type === "timepris") return Number(s.base_price || 0) * it.hours;
  return (s.calculator_steps || []).reduce((t, step) => t + (it.stepValues[step.id] || 0) * Number(step.price_per_unit), 0);
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  businessName: string;
  /** Forudfylder kundefelter ved åbning (fx hvis du opretter kunden først). */
  initialCustomer?: {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string | null;
    address?: string | null;
    zip_code?: string | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    cvr?: string | null;
    company_name?: string | null;
  } | null;
}

const CreateManualOrderDialog = ({ open, onOpenChange, businessId, businessName, initialCustomer }: Props) => {
  const { data: services = [] } = useServices(businessId);
  const activeServices = useMemo(() => (services as any[]).filter((s) => s.is_active !== false) as Service[], [services]);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [cvr, setCvr] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");

  // Cart
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Synkron re-entry guard — staten "submitting" opdateres asynkront, så
  // hurtige dobbelt-klik kan nå at trigge handleSubmit to gange. Ref'en
  // blokerer det øjeblikkeligt, så samme bestilling aldrig oprettes 2x.
  const submittingRef = useRef(false);

  // Forudfyld fra initialCustomer når dialogen åbner
  useEffect(() => {
    if (!open || !initialCustomer) return;
    if (initialCustomer.customer_name) setCustomerName(initialCustomer.customer_name);
    if (initialCustomer.customer_email) setCustomerEmail(initialCustomer.customer_email);
    if (initialCustomer.customer_phone) setCustomerPhone(initialCustomer.customer_phone);
    if (initialCustomer.address) setAddress(initialCustomer.address);
    if (initialCustomer.zip_code) setZipCode(initialCustomer.zip_code);
    if (initialCustomer.city) setCity(initialCustomer.city);
    if (initialCustomer.latitude != null) setLatitude(initialCustomer.latitude);
    if (initialCustomer.longitude != null) setLongitude(initialCustomer.longitude);
    if (initialCustomer.cvr) setCvr(initialCustomer.cvr);
    if (initialCustomer.company_name) setCompanyName(initialCustomer.company_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalAmount = useMemo(() => roundPrice(items.reduce((s, it) => s + calcItemTotal(it), 0)), [items]);

  const addService = (serviceId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc || items.some((i) => i.serviceId === serviceId)) return;
    const stepValues: Record<string, number> = {};
    (svc.calculator_steps || []).forEach((s) => { stepValues[s.id] = Number(s.default_value ?? s.min_value ?? 0); });
    const intervals = svc.interval_options && svc.interval_options.length > 0 ? svc.interval_options : ["engangskøb"];
    // Default opstartsdato = i dag (gør UI venligt — brugeren kan altid ændre).
    const today = format(new Date(), "yyyy-MM-dd");
    setItems((prev) => [
      ...prev,
      {
        serviceId, service: svc, hours: 1, stepValues, interval: intervals[0], startDate: today,
      },
    ]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.serviceId !== id));

  const updateItem = (id: string, patch: Partial<BuilderItem>) =>
    setItems((prev) => prev.map((i) => i.serviceId === id ? { ...i, ...patch } : i));

  const reset = () => {
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setContactPerson("");
    setAddress(""); setZipCode(""); setCity("");
    setLatitude(null); setLongitude(null);
    setCvr(""); setCompanyName("");
    setBusinessMessage("");
    setItems([]);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Udfyld kundens navn og email");
      submittingRef.current = false;
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
      toast.error("Ugyldig email-adresse");
      submittingRef.current = false;
      return;
    }
    if (items.length === 0) {
      toast.error("Tilføj mindst én service til bestillingen");
      submittingRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      // Adressen er allerede verificeret + geokodet via DAWA-autocomplete
      const lat = latitude;
      const lng = longitude;

      // Bestillinger oprettet manuelt af virksomheden er altid forhåndsgodkendt
      // — virksomheden har allerede besluttet at tage opgaven, så kunden skal
      // bare modtage en bekræftelses-mail (ligesom et helt almindeligt køb).
      const customerEmailLower = customerEmail.trim().toLowerCase();

      // Én ordre pr. service. Første ordre = forælder; alle peger på dens id via parent_order_id.
      const parentOrderId = crypto.randomUUID();
      const childOrderIds = items.map((_, i) => i === 0 ? parentOrderId : crypto.randomUUID());

      const orderRows = items.map((it, idx) => {
        const total = roundPrice(calcItemTotal(it));
        const isParent = idx === 0;
        return {
          id: childOrderIds[idx],
          parent_order_id: parentOrderId, // forælderen peger også på sig selv → simpel gruppering
          business_id: businessId,
          customer_name: customerName.trim(),
          customer_email: customerEmailLower,
          customer_phone: customerPhone.trim() || null,
          address: address.trim() || null,
          zip_code: zipCode.trim() || null,
          city: city.trim() || null,
          latitude: lat,
          longitude: lng,
          cvr: cvr.replace(/\D/g, "") || null,
          company_name: companyName.trim() || null,
          notes: contactPerson.trim() ? `Kontaktperson: ${contactPerson.trim()}` : null,
          preferred_date: it.startDate || null,
          preferred_time_start: null,
          preferred_time_end: null,
          estimated_duration_minutes: null,
          total_amount: total,
          // Kendte kunder: ordren bekræftes med det samme.
          // Ukendte kunder: afventer approval via mail-link.
          status: "confirmed" as const,
          business_message: isParent ? (businessMessage.trim() || null) : null,
          approval_token: null,
          approval_expires_at: null,
          requires_customer_approval: false,
        };
      });
      const { error: orderErr } = await supabase.from("orders").insert(orderRows as any);
      if (orderErr) throw orderErr;

      // Indsæt ét order_item pr. ordre
      const orderItems = items.map((it, idx) => {
        const total = roundPrice(calcItemTotal(it));
        const stepDetails = (it.service.calculator_steps || []).map((s) => ({
          id: s.id, label: s.label, value: it.stepValues[s.id] || 0, unit: s.unit,
          price_per_unit: Number(s.price_per_unit),
          subtotal: roundPrice((it.stepValues[s.id] || 0) * Number(s.price_per_unit)),
        }));
        const description = it.service.pricing_type === "timepris"
          ? `${it.hours} timer`
          : it.service.pricing_type === "fast_pris" ? "Specifik pris" : "";
        return {
          order_id: childOrderIds[idx],
          service_id: it.serviceId,
          service_name: it.service.name,
          quantity: 1,
          unit_price: total,
          total_price: total,
          details: {
            description,
            interval: it.interval,
            stepDetails: it.service.pricing_type === "prisberegner" ? stepDetails : undefined,
            pricingSnapshot: buildPricingSnapshot(it.service as any),
          },
        };
      });
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems as any);
      if (itemsErr) throw itemsErr;

      const { data: biz } = await supabase
        .from("businesses")
        .select("name, phone, email")
        .eq("id", businessId)
        .maybeSingle();

      // Manuel oprettelse er altid forhåndsgodkendt — send bekræftelses-mail.
      {
        const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "manual-order-confirmed",
            recipientEmail: customerEmailLower,
            idempotencyKey: `manual-order-confirmed-${parentOrderId}`,
            templateData: {
              customerName: customerName.trim(),
              businessName: biz?.name || businessName,
              businessPhone: biz?.phone,
              businessEmail: biz?.email,
              businessMessage: businessMessage.trim() || undefined,
              address: address.trim()
                ? `${address.trim()}${zipCode.trim() || city.trim() ? `, ${[zipCode.trim(), city.trim()].filter(Boolean).join(" ")}` : ""}`
                : undefined,
              preferredDate: items[0]?.startDate || undefined,
              totalAmount,
              items: items.map((it) => ({
                name: it.service.name,
                quantity: 1,
                price: roundPrice(calcItemTotal(it)),
                intervalLabel: it.interval && it.interval !== "engangskøb" ? INTERVAL_LABELS[it.interval] || it.interval : undefined,
                description: it.service.pricing_type === "timepris" ? `${it.hours} timer` : undefined,
                preferredDate: it.startDate || undefined,
                stepDetails: it.service.pricing_type === "prisberegner"
                  ? (it.service.calculator_steps || []).map((s) => ({
                      label: s.label, value: it.stepValues[s.id] || 0, unit: s.unit,
                      subtotal: roundPrice((it.stepValues[s.id] || 0) * Number(s.price_per_unit)),
                    }))
                  : undefined,
              })),
            },
          },
        });
        if (mailErr) {
          console.error("Mail send failed:", mailErr);
          toast.success("Bestilling oprettet og bekræftet (bekræftelses-mail kunne ikke sendes).");
        } else {
          toast.success("Bestilling oprettet og bekræftet — kunden har fået en bekræftelses-mail.");
        }
        reset();
        onOpenChange(false);
        return;
      }
    } catch (e: any) {
      toast.error("Kunne ikke oprette bestilling: " + (e.message || "Ukendt fejl"));
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onOpenChange(v); else if (v) onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-5 py-4 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<ShoppingBag className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Opret bestilling for kunde</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg services fra dit katalog og udfyld kundens oplysninger. Bestillingen oprettes som forhåndsgodkendt og kunden modtager en bekræftelses-mail med det samme.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 bg-secondary/20">
          {/* Kunde */}
          {(() => {
            const isBusiness = cvr.replace(/\D/g, "").length === 8 || !!companyName;
            return (
              <Section icon={<User className="h-3.5 w-3.5" />} title={isBusiness ? "Erhvervskunde" : "Kunde"} required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={isBusiness ? "Firmanavn" : "Navn"} required>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={isBusiness ? "Fx Hansen ApS" : "Fx Mette Hansen"} className="h-9" />
                  </Field>
                  <Field label="Email" required>
                    <CustomerEmailAutocomplete
                      businessId={businessId}
                      value={customerEmail}
                      onChange={setCustomerEmail}
                      onSelect={(c) => {
                        setCustomerEmail(c.customer_email);
                        if (c.company_name) setCompanyName(c.company_name);
                        if (c.cvr) setCvr(c.cvr);
                        // Hvis kunden er erhverv, behold company_name som "navn"-feltets værdi
                        setCustomerName(c.company_name || c.customer_name || "");
                        if (c.company_name && c.customer_name && c.company_name !== c.customer_name) {
                          setContactPerson(c.customer_name);
                        }
                        if (c.customer_phone) setCustomerPhone(c.customer_phone);
                        if (c.address) setAddress(c.address);
                        if (c.zip_code) setZipCode(c.zip_code);
                        if (c.city) setCity(c.city);
                        setLatitude(c.latitude ?? null);
                        setLongitude(c.longitude ?? null);
                        toast.success("Kundeoplysninger udfyldt");
                      }}
                      placeholder="kunde@email.dk"
                      className="h-9"
                    />
                  </Field>
                  <Field label="Telefon">
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-9" />
                  </Field>
                  {isBusiness ? (
                    <Field label="Kontaktperson">
                      <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Fx Mette Hansen" className="h-9" />
                    </Field>
                  ) : (
                    <Field label={"Adresse"}>
                      <AddressAutocomplete
                        value={{ address, zip_code: zipCode, city, latitude, longitude }}
                        onChange={(v) => {
                          setAddress(v.address);
                          setZipCode(v.zip_code);
                          setCity(v.city);
                          setLatitude(v.latitude ?? null);
                          setLongitude(v.longitude ?? null);
                        }}
                      />
                    </Field>
                  )}
                </div>
                {isBusiness && (
                  <div className="mt-3">
                    <Field label="Service-adresse">
                      <AddressAutocomplete
                        value={{ address, zip_code: zipCode, city, latitude, longitude }}
                        onChange={(v) => {
                          setAddress(v.address);
                          setZipCode(v.zip_code);
                          setCity(v.city);
                          setLatitude(v.latitude ?? null);
                          setLongitude(v.longitude ?? null);
                        }}
                      />
                    </Field>
                  </div>
                )}
              </Section>
            );
          })()}

          {/* CVR (valgfrit) */}
          <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Virksomhed (CVR)" hint="Valgfrit — auto-udfylder felter">
            <CvrLookupField
              value={cvr}
              onChange={setCvr}
              onResult={(r: CvrResult | null) => {
                if (!r) return;
                setCompanyName(r.name);
                if (!customerName) setCustomerName(r.name);
                if (r.address) setAddress(r.address);
                if (r.zip_code) setZipCode(r.zip_code);
                if (r.city) setCity(r.city);
                if (r.phone && !customerPhone) setCustomerPhone(r.phone);
                if (r.email && !customerEmail) setCustomerEmail(r.email);
                setLatitude(null); setLongitude(null); // re-verify via DAWA
              }}
            />
            {(cvr.replace(/\D/g, "").length === 8 || companyName) && (
              <div className="mt-2.5 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                <p className="text-[11px] text-foreground">
                  Bestillingen markeres som <strong>erhvervskunde</strong>.
                </p>
              </div>
            )}
          </Section>

          {/* Services */}
          <Section
            icon={<Package className="h-3.5 w-3.5" />}
            title="Services"
            required
            hint={items.length > 0 ? `${items.length} valgt` : undefined}
          >
            <Select value="" onValueChange={addService}>
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="+ Tilføj service fra dit katalog…" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {activeServices.length === 0 && (
                  <SelectItem value="__none" disabled>Ingen services oprettet endnu</SelectItem>
                )}
                {activeServices
                  .filter((s) => !items.some((i) => i.serviceId === s.id))
                  .map((s) => {
                    const sub = (s as any).subcategory as string | null;
                    return (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="py-2 pr-3 pl-2 data-[highlighted]:bg-secondary data-[highlighted]:text-foreground focus:bg-secondary focus:text-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-base leading-none"
                            aria-hidden="true"
                          >
                            {getSubcategoryIcon(sub, s.service_category)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                            {(sub || s.service_category) && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {sub || s.service_category}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>

            {items.length === 0 && activeServices.length > 0 && (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center">
                <Package className="mx-auto h-5 w-5 text-muted-foreground/60" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Ingen services valgt endnu. Tilføj én fra dropdown'en ovenfor for at komme i gang.
                </p>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {items.map((it) => {
                  const intervals = it.service.interval_options && it.service.interval_options.length > 0 ? it.service.interval_options : ["engangskøb"];
                  const sub = (it.service as any).subcategory as string | null;
                  return (
                    <Card key={it.serviceId} className="p-3 bg-background shadow-sm">
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-base leading-none"
                          aria-hidden="true"
                        >
                          {getSubcategoryIcon(sub, it.service.service_category)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-sm leading-tight text-foreground">{it.service.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {(sub || it.service.service_category) && (
                              <span className="text-[10px] text-muted-foreground">
                                {sub || it.service.service_category}
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {it.service.pricing_type === "fast_pris" ? "Specifik pris" : it.service.pricing_type === "timepris" ? "Timepris" : "Prisberegner"}
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(it.serviceId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1 rounded"
                          aria-label={`Fjern ${it.service.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {it.service.pricing_type === "timepris" && (
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
                          <Label className="text-xs text-muted-foreground">Timer</Label>
                          <Input
                            type="number" min={0.5} max={24} step={0.5} value={it.hours}
                            onChange={(e) => updateItem(it.serviceId, { hours: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                            className="h-9 w-24"
                          />
                          <span className="text-muted-foreground text-xs">× {it.service.base_price} kr</span>
                        </div>
                      )}

                      {it.service.pricing_type === "prisberegner" && (it.service.calculator_steps?.length ?? 0) > 0 && (
                        <div className="space-y-2 mb-2 rounded-md bg-secondary/40 p-2">
                          {[...(it.service.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((step) => (
                            <div key={step.id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="flex-1 min-w-[120px] truncate">{step.label} <span className="text-muted-foreground">({step.price_per_unit} kr/{step.unit})</span></span>
                              <Input type="number" min={Number(step.min_value ?? 0)} max={Number(step.max_value ?? 9999)}
                                value={it.stepValues[step.id] ?? 0}
                                onChange={(e) => updateItem(it.serviceId, { stepValues: { ...it.stepValues, [step.id]: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                className="h-9 w-24" />
                              <span className="text-muted-foreground w-8 text-right text-xs">{step.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {intervals.length > 1 && (
                        <Select value={it.interval} onValueChange={(v) => updateItem(it.serviceId, { interval: v })}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {intervals.map((iv) => <SelectItem key={iv} value={iv} className="text-sm">{INTERVAL_LABELS[iv] || iv}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Opstartsdato — pr. service, så hver aftale kan have sin egen startdato */}
                      <div className="mt-2 rounded-md bg-secondary/30 p-2.5">
                        <Label className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                          <Calendar className="h-3 w-3" />
                          Opstartsdato
                        </Label>
                        <DatePickerField
                          value={it.startDate}
                          onChange={(v) => updateItem(it.serviceId, { startDate: v })}
                          minDate={format(new Date(), "yyyy-MM-dd")}
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Datoen hvor denne service skal starte{it.interval && it.interval !== "engangskøb" ? " (første gentagelse)" : ""}. Tidspunkt planlægges på ruten.
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Subtotal</span>
                        <span className="font-bold text-sm tabular-nums">{fmt(roundPrice(calcItemTotal(it)))}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Besked */}
          <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Besked til kunden" hint="Valgfrit — vises i mailen">
            <Textarea
              value={businessMessage}
              onChange={(e) => setBusinessMessage(e.target.value.slice(0, 500))}
              placeholder="Fx: Hej Mette, her er det vi snakkede om i telefonen…"
              rows={2}
              className="bg-background resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{businessMessage.length}/500</p>
          </Section>
        </div>

        {/* Footer — matcher SheetFooterBar i StopDetailSheet/RouteEditSheet */}
        <SheetFooterBar>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-baseline justify-between gap-2 sm:justify-start">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">I alt</span>
              <span className="text-xl font-bold tabular-nums">{fmt(totalAmount)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={submitting}>
                Annullér
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={handleSubmit} disabled={submitting || items.length === 0}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                Opret bestilling
              </Button>
            </div>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};

export default CreateManualOrderDialog;