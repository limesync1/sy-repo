import { formatPrice } from "@/lib/price-format";
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
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Send, ShoppingBag, User, MessageSquare, Package, Calendar, Repeat, ListPlus, Plus } from "lucide-react";
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
import { NumberStepper } from "@/components/shared/NumberStepper";

import { IndustryIcon } from "@/components/IndustryIcon";
import ActiveServiceRequired from "./ActiveServiceRequired";
import ServicePicker from "./ServicePicker";

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
  const { data: services = [], isLoading: servicesLoading } = useServices(businessId);
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

  const [showCvr, setShowCvr] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const totalAmount = useMemo(() => roundPrice(items.reduce((s, it) => s + calcItemTotal(it), 0)), [items]);

  // Hvor mange af de valgte aftaler er tilbagevendende? Bruges til en lille
  // chip i footeren så brugeren har overblik over abonnement vs. engang.
  const recurringCount = useMemo(
    () => items.filter((it) => it.interval && it.interval !== "engangskøb").length,
    [items],
  );

  // Grupper aktive services efter kategori i dropdown'en så lange kataloger
  // bliver scanbare ("Rengøring", "Have", "Maler" …).
  const servicesByCategory = useMemo(() => {
    const groups = new Map<string, Service[]>();
    for (const s of activeServices) {
      if (items.some((i) => i.serviceId === s.id)) continue;
      const cat = s.service_category || "Andet";
      const arr = groups.get(cat) || [];
      arr.push(s);
      groups.set(cat, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "da"));
  }, [activeServices, items]);

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
    if (activeServices.length === 0) {
      toast.error("Opret eller aktivér en service før du opretter en bestilling");
      submittingRef.current = false;
      return;
    }
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
        const { data: mailResult, error: mailErr } = await supabase.functions.invoke("order-email-notification", {
          body: { orderId: parentOrderId, kind: "manual-confirmed" },
        });
        if (mailErr || !mailResult?.sent) {
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
      <DialogContent className="modal-large planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl lg:max-w-5xl flex-col gap-0 overflow-visible rounded-md p-0 sm:max-h-[92vh]" onOpenAutoFocus={(e) => { if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault(); }}>
        <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-2.5 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            title={<DialogTitle className="text-base">Opret bestilling</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Kunden får en bekræftelse på mail.
              </DialogDescription>
            }
          >
          </SheetHeaderBlock>
        </DialogHeader>

        {servicesLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : activeServices.length === 0 ? (
          <ActiveServiceRequired />
        ) : <div className="planner-overlay-body min-h-0 flex-1 overflow-x-visible overflow-y-auto px-3 sm:px-5 py-3 space-y-2">
          {/* Kunde */}
          {(() => {
            const isBusiness = cvr.replace(/\D/g, "").length === 8 || !!companyName;
            return (
              <Section icon={<User className="h-3.5 w-3.5" />} title={isBusiness ? "Erhvervskunde" : "Kunde"} required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={isBusiness ? "Firmanavn" : "Navn"} required>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={isBusiness ? "Fx Hansen ApS" : "Fx Mette Hansen"} className="h-11 sm:h-10" />
                  </Field>
                  <Field label="E-mail" required>
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
                      className="h-11 sm:h-10"
                    />
                  </Field>
                  <Field label="Telefon">
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-11 sm:h-10" />
                  </Field>
                  {isBusiness ? (
                    <Field label="Kontaktperson">
                      <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Fx Mette Hansen" className="h-11 sm:h-10" />
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
                <div className="mt-2">
                  {!showCvr && !(cvr.replace(/\D/g, "").length === 8 || companyName) ? (
                    <button type="button" onClick={() => setShowCvr(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-foreground hover:underline sm:min-h-9">
                      <Building2 className="h-4 w-4 text-accent" />Erhvervskunde? Slå CVR op
                    </button>
                  ) : (
                    <div className="space-y-2">
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
                    </div>
                  )}
                </div>
              </Section>
            );
          })()}

          {/* Services */}
          <Section
            icon={<ListPlus className="h-3.5 w-3.5" />}
            title="Services"
            required
            hint={items.length > 0 ? `${items.length} valgt` : undefined}
          >
            <ServicePicker
              businessId={businessId}
              services={activeServices as any}
              selectedIds={items.map((i) => i.serviceId)}
              onAdd={addService}
              onRemove={removeItem}
              summary={<>{items.length} valgt · {fmt(totalAmount)} <span className="font-normal text-muted-foreground">uden moms</span></>}
              renderSelected={(id) => {
                const it = items.find((x) => x.serviceId === id);
                if (!it) return null;
                const intervals = it.service.interval_options && it.service.interval_options.length > 0 ? it.service.interval_options : ["engangskøb"];
                return (
                  <div className="space-y-3 rounded-lg border border-accent/30 bg-card p-3">
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground"><Repeat className="h-3.5 w-3.5" />Interval</Label>
                      {intervals.length === 1 ? (
                        <p className="text-sm">{INTERVAL_LABELS[intervals[0]] || intervals[0]}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Interval">
                          {intervals.map((iv) => (
                            <button key={iv} type="button" role="radio" aria-checked={it.interval === iv}
                              onClick={() => updateItem(id, { interval: iv })}
                              className={`min-h-11 rounded-md border px-3 text-sm font-medium transition-colors ${it.interval === iv ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}>
                              {INTERVAL_LABELS[iv] || iv}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {it.service.pricing_type === "timepris" && (
                      <div>
                        <Label className="mb-1.5 block text-xs font-semibold text-foreground">Timer <span className="font-normal text-muted-foreground">× {formatPrice(it.service.base_price)} uden moms</span></Label>
                        <NumberStepper value={it.hours} min={0.5} max={24} step={0.5} ariaLabel="Antal timer"
                          onChange={(v) => updateItem(id, { hours: v })} className="w-full sm:w-44" />
                      </div>
                    )}

                    {it.service.pricing_type === "prisberegner" && (it.service.calculator_steps?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        {[...(it.service.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((step) => (
                          <div key={step.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                            <span className="min-w-0 flex-1 break-words text-xs">{step.label} <span className="text-muted-foreground">({formatPrice(step.price_per_unit)}/{step.unit})</span></span>
                            <NumberStepper value={it.stepValues[step.id] ?? 0} min={Number(step.min_value ?? 0)} max={Number(step.max_value ?? 9999)}
                              unit={step.unit} ariaLabel={step.label}
                              onChange={(v) => updateItem(id, { stepValues: { ...it.stepValues, [step.id]: v } })}
                              className="w-full sm:w-44" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground"><Calendar className="h-3.5 w-3.5" />Startdato{it.interval && it.interval !== "engangskøb" ? " (første gang)" : ""}</Label>
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        {[{ l: "I dag", d: 0 }, { l: "I morgen", d: 1 }].map(({ l, d }) => {
                          const v = format(addDays(new Date(), d), "yyyy-MM-dd");
                          return (
                            <button key={l} type="button" onClick={() => setStartDate(id, v)} aria-pressed={it.startDate === v}
                              className={`min-h-11 rounded-md border px-3 text-sm font-medium transition-colors sm:min-h-9 ${it.startDate === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}>
                              {l}
                            </button>
                          );
                        })}
                      </div>
                      <DatePickerField value={it.startDate} onChange={(v) => setStartDate(id, v)} minDate={format(new Date(), "yyyy-MM-dd")} />
                      {items.length > 1 && (
                        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:min-h-9">
                          <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={sameDate} onChange={(e) => { setSameDate(e.target.checked); if (e.target.checked) setItems((p) => p.map((x) => ({ ...x, startDate: it.startDate }))); }} />
                          Samme dato for alle services
                        </label>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">Tidspunktet planlægges på ruten.</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-xs text-muted-foreground">Subtotal</span>
                      <span className="text-sm font-bold tabular-nums">{fmt(roundPrice(calcItemTotal(it)))} <span className="text-xs font-normal text-muted-foreground">uden moms</span></span>
                    </div>
                  </div>
                );
              }}
            />
          </Section>

          {!showMsg && !businessMessage ? (
            <button type="button" onClick={() => setShowMsg(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-foreground hover:underline">
              <MessageSquare className="h-4 w-4 text-accent" />Tilføj besked til kunden
            </button>
          ) : (
          
          <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Besked til kunden" hint="Valgfrit — vises i mailen">
            <Textarea
              value={businessMessage}
              onChange={(e) => setBusinessMessage(e.target.value.slice(0, 500))}
              placeholder="Fx: Hej Mette, her er det vi snakkede om i telefonen…"
              rows={2}
              className="bg-background resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">{businessMessage.length}/500</p>
          </Section>
          )}
        </div>}

        {/* Footer — matcher SheetFooterBar i StopDetailSheet/RouteEditSheet */}
        {activeServices.length > 0 && <SheetFooterBar>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">I alt</span>
                <span className="text-lg font-bold tabular-nums">{fmt(totalAmount)}</span>
                <span className="text-xs text-muted-foreground">uden moms</span>
              </div>
              <span className={`text-[11px] ${missing ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                {missing ? missing : <>
                  {items.length} {items.length === 1 ? "service" : "services"}
                  {recurringCount > 0 && <> · <span className="font-medium text-foreground">{recurringCount}</span> tilbagevendende</>}
                  <span className="hidden lg:inline"> · Ctrl+Enter opretter</span>
                </>}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-11 flex-1 sm:min-h-10 sm:flex-none" onClick={requestClose} disabled={submitting}>
                Annullér
              </Button>
              <Button className="min-h-11 flex-1 sm:min-h-10 sm:flex-none" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {items.length > 1 ? `Opret ${items.length} bestillinger` : "Opret bestilling"}
              </Button>
            </div>
          </div>
        </SheetFooterBar>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kassér bestilling?</AlertDialogTitle>
          <AlertDialogDescription>Det, du har udfyldt, bliver ikke gemt.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Fortsæt redigering</AlertDialogCancel>
          <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { reset(); setConfirmClose(false); onOpenChange(false); }}>Kassér</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default CreateManualOrderDialog;