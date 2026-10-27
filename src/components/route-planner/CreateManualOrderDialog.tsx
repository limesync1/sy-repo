import { formatPrice } from "@/lib/price-format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { InvoiceIntervalPicker } from "@/components/admin/invoicing/InvoiceIntervalPicker";
import { describeInvoiceInterval, invoiceIntervalOrderFields, type InvoiceIntervalValue } from "@/lib/invoice-interval";
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
import { Loader2, Trash2, Send, ShoppingBag, User, MessageSquare, Package, Calendar, Repeat, ListPlus, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { roundPrice, buildPricingSnapshot, getSmartStep } from "@/lib/service-pricing";
import { calcItemTotal as calcItemTotalBase, clampStep } from "@/lib/order-item-total";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { Building2, BadgeCheck } from "lucide-react";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "./SheetSection";
import CustomerEmailAutocomplete from "./CustomerEmailAutocomplete";
import { DatePickerField } from "./DatePickerField";
import { format, addDays } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NumberStepper } from "@/components/shared/NumberStepper";

import { IndustryIcon } from "@/components/IndustryIcon";
import ActiveServiceRequired from "./ActiveServiceRequired";
import ServicePicker from "./ServicePicker";
import { createInsertStage, resumeInsert, type InsertStage } from "@/lib/resumable-insert";

type CalcStep = { id: string; label: string; unit: string; price_per_unit: number; min_value: number | null; max_value: number | null; default_value: number | null; sort_order: number | null };
type Service = { id: string; name: string; description: string | null; pricing_type: "fast_pris" | "timepris" | "prisberegner"; base_price: number | null; unit: string | null; is_active: boolean | null; interval_options: string[] | null; calculator_steps?: CalcStep[]; business_id: string; service_category?: string | null; subcategory?: string | null };

interface BuilderItem {
  serviceId: string;
  service: Service;
  hours: number;
  /** Antal ved fast pris. */
  quantity: number;
  stepValues: Record<string, number>;
  interval: string;
  /** Opstartsdato pr. service (yyyy-MM-dd). */
  startDate: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(n || 0);

const calcItemTotal = (it: BuilderItem): number => calcItemTotalBase(it);

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
  const queryClient = useQueryClient();
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
  const [invoiceValue, setInvoiceValue] = useState<InvoiceIntervalValue>({ interval: null, count: null, unit: null });
  const [invoiceEmail, setInvoiceEmail] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setInvoiceEmail(customerEmail.trim().toLowerCase()), 350);
    return () => window.clearTimeout(timer);
  }, [customerEmail]);
  const { data: accounting, isError: accountingError, refetch: retryAccounting } = useQuery({
    queryKey: ["create-order-accounting", businessId],
    enabled: open && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_integrations")
        .select("is_active, invoice_interval, invoice_interval_count, invoice_interval_unit")
        .eq("business_id", businessId).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
  const { data: customerInvoice, isFetching: customerInvoiceLoading, isError: customerInvoiceError } = useQuery({
    queryKey: ["create-order-customer-invoice", businessId, invoiceEmail],
    enabled: open && !!accounting?.is_active && /^\S+@\S+\.\S+$/.test(invoiceEmail),
    queryFn: async () => {
      const columns = "invoice_interval, invoice_interval_count, invoice_interval_unit";
      const [business, privateCustomer] = await Promise.all([
        supabase.from("business_customers").select(columns).eq("business_id", businessId).ilike("email", invoiceEmail).not("invoice_interval", "is", null).limit(1),
        supabase.from("private_customers").select(columns).eq("business_id", businessId).ilike("email", invoiceEmail).not("invoice_interval", "is", null).limit(1),
      ]);
      if (business.error || privateCustomer.error) throw business.error ?? privateCustomer.error;
      return business.data?.[0] ?? privateCustomer.data?.[0] ?? null;
    },
    staleTime: 30_000,
  });
  const inheritedInvoice = customerInvoice ?? accounting;
  const inheritedLabel = describeInvoiceInterval({
    interval: inheritedInvoice?.invoice_interval ?? "per_visit",
    count: inheritedInvoice?.invoice_interval_count ?? null,
    unit: inheritedInvoice?.invoice_interval_unit as InvoiceIntervalValue["unit"] ?? null,
  });

  // Cart
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Synkron re-entry guard — staten "submitting" opdateres asynkront, så
  // hurtige dobbelt-klik kan nå at trigge handleSubmit to gange. Ref'en
  // blokerer det øjeblikkeligt, så samme bestilling aldrig oprettes 2x.
  const submittingRef = useRef(false);
  const pendingSave = useRef<{ parentOrderId: string; orders: InsertStage<any>; items: InsertStage<any> } | null>(null);
  const [needsResume, setNeedsResume] = useState(false);

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
  const [sameDate, setSameDate] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; services?: string }>({});
  const clearErr = (k: "name" | "email" | "services") => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
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
    if (submittingRef.current || pendingSave.current) return;
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc || items.some((i) => i.serviceId === serviceId)) return;
    const stepValues: Record<string, number> = {};
    (svc.calculator_steps || []).forEach((s) => { stepValues[s.id] = clampStep(s as any, Number(s.default_value ?? s.min_value ?? 0)); });
    const intervals = svc.interval_options && svc.interval_options.length > 0 ? svc.interval_options : ["engangskøb"];
    // Default opstartsdato = i dag (gør UI venligt — brugeren kan altid ændre).
    const today = format(new Date(), "yyyy-MM-dd");
    setItems((prev) => [
      ...prev,
      {
        serviceId, service: svc, hours: 1, quantity: 1, stepValues, interval: intervals[0], startDate: sameDate && prev[0] ? prev[0].startDate : today,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (submittingRef.current || pendingSave.current) return;
    const idx = items.findIndex((i) => i.serviceId === id);
    const removed = items[idx];
    setItems((prev) => prev.filter((i) => i.serviceId !== id));
    if (!removed) return;
    toast(`${removed.service.name} fjernet`, {
      duration: 6000,
      action: {
        label: "Fortryd",
        onClick: () => {
          if (submittingRef.current || pendingSave.current) return;
          setItems((prev) => prev.some((i) => i.serviceId === id) ? prev : [...prev.slice(0, idx), removed, ...prev.slice(idx)]);
        },
      },
    });
  };

  const updateItem = (id: string, patch: Partial<BuilderItem>) =>
    setItems((prev) => prev.map((i) => i.serviceId === id ? { ...i, ...patch } : i));

  const setStartDate = (id: string, v: string) =>
    setItems((prev) => prev.map((i) => (sameDate || i.serviceId === id) ? { ...i, startDate: v } : i));

  const reset = () => {
    pendingSave.current = null;
    setNeedsResume(false);
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setContactPerson("");
    setAddress(""); setZipCode(""); setCity("");
    setLatitude(null); setLongitude(null);
    setCvr(""); setCompanyName("");
    setBusinessMessage("");
    setItems([]);
    setInvoiceValue({ interval: null, count: null, unit: null });
    setErrors({}); setShowCvr(false); setShowMsg(false); setSameDate(false);
  };

  const isDirty = !!(customerName || customerEmail || customerPhone || address || cvr || businessMessage || items.length || invoiceValue.interval);
  const requestClose = () => {
    if (submittingRef.current) return;
    if (pendingSave.current) {
      // Tillad altid at lukke via bekræftelse, så vinduet aldrig sidder fast.
      setConfirmClose(true);
      return;
    }
    if (isDirty) setConfirmClose(true); else onOpenChange(false);
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(customerEmail.trim());
  const missing = !customerName.trim() ? "Mangler kundens navn"
    : !customerEmail.trim() ? "Mangler email"
    : !emailValid ? "Email ser forkert ud"
    : items.length === 0 ? "Vælg mindst én service" : "";

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    if (!pendingSave.current && activeServices.length === 0) {
      toast.error("Opret eller aktivér en service før du opretter en bestilling");
      submittingRef.current = false;
      return;
    }
    const errs: typeof errors = {};
    if (!customerName.trim()) errs.name = "Skriv kundens navn";
    if (!customerEmail.trim()) errs.email = "Skriv kundens email";
    else if (!emailValid) errs.email = "Tjek email — fx navn@firma.dk";
    if (items.length === 0) errs.services = "Tilføj mindst én service";
    if (!pendingSave.current && Object.keys(errs).length) {
      setErrors(errs);
      const first = errs.name ? "cmo-name" : errs.email ? "cmo-email" : "cmo-services";
      document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      if (!pendingSave.current) {
      const parentOrderId = crypto.randomUUID();
      const childOrderIds = items.map((_, i) => i === 0 ? parentOrderId : crypto.randomUUID());

      const orderRows = items.map((it, idx) => {
        const total = roundPrice(calcItemTotal(it));
        const isParent = idx === 0;
        return {
          id: childOrderIds[idx],
          parent_order_id: parentOrderId, // forælderen peger også på sig selv → simpel gruppering
          business_id: businessId,
          ...invoiceIntervalOrderFields(invoiceValue, !!accounting?.is_active),
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
      // Indsæt ét order_item pr. ordre
      const orderItems = items.map((it, idx) => {
        const total = roundPrice(calcItemTotal(it));
        const stepDetails = (it.service.calculator_steps || []).map((s) => {
          const v = clampStep(s, it.stepValues[s.id] ?? 0);
          return { id: s.id, label: s.label, value: v, unit: s.unit, price_per_unit: Number(s.price_per_unit), subtotal: roundPrice(v * Number(s.price_per_unit)) };
        });
        const isFast = it.service.pricing_type === "fast_pris";
        const qty = isFast ? Math.max(1, it.quantity || 1) : 1;
        const description = it.service.pricing_type === "timepris"
          ? `${it.hours} timer`
          : isFast ? (qty > 1 ? `${qty} ${it.service.unit || "stk"}` : "Specifik pris") : "";
        return {
          id: crypto.randomUUID(),
          order_id: childOrderIds[idx],
          service_id: it.serviceId,
          service_name: it.service.name,
          quantity: qty,
          unit_price: isFast ? roundPrice(Number(it.service.base_price || 0)) : total,
          total_price: total,
          details: {
            description,
            interval: it.interval,
            stepDetails: it.service.pricing_type === "prisberegner" ? stepDetails : undefined,
            pricingSnapshot: buildPricingSnapshot(it.service as any),
          },
        };
      });
      pendingSave.current = {
        parentOrderId,
        orders: createInsertStage(orderRows),
        items: createInsertStage(orderItems),
      };
      }
      const save = pendingSave.current;
      await resumeInsert(save.orders, {
        existingIds: async (ids) => {
          const { data, error } = await supabase.from("orders").select("id").eq("business_id", businessId).in("id", ids);
          if (error) throw error;
          return (data ?? []).map((row) => row.id);
        },
        insert: async (rows) => {
          const { error } = await supabase.from("orders").insert(rows);
          if (error) throw error;
        },
      });
      await resumeInsert(save.items, {
        existingIds: async (ids) => {
          const { data, error } = await supabase.from("order_items").select("id").in("order_id", save.orders.rows.map((row) => row.id)).in("id", ids);
          if (error) throw error;
          return (data ?? []).map((row) => row.id);
        },
        insert: async (rows) => {
          const { error } = await supabase.from("order_items").insert(rows);
          if (error) throw error;
        },
      });

      // Start delivery before closing; persisted orders/items are essential,
      // but email latency and list refetches must not hold the form open.
      void supabase.functions.invoke("order-email-notification", {
        body: { orderId: save.parentOrderId, kind: "manual-confirmed" },
      }).then(({ data, error }) => {
        if (error || !data?.sent) toast.warning("Bestillingen er gemt, men bekræftelsesmailen kunne ikke sendes.");
      }).catch(() => toast.warning("Bestillingen er gemt, men bekræftelsesmailen kunne ikke sendes."));
      void queryClient.invalidateQueries();
      toast.success("Bestilling oprettet og bekræftet — sender bekræftelsesmail.");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      // Hvis intet nåede at blive gemt, frigives formularen igen, så data kan rettes.
      const save = pendingSave.current;
      let nothingSaved = !save;
      if (save && !save.orders.complete) {
        try {
          const { data } = await supabase.from("orders").select("id").eq("business_id", businessId).in("id", save.orders.rows.map((r) => r.id));
          nothingSaved = (data ?? []).length === 0;
        } catch { /* usikkert: behold genoptagelse */ }
      }
      if (nothingSaved) {
        pendingSave.current = null;
        setNeedsResume(false);
        toast.error("Bestillingen blev ikke gemt", { description: `${e.message || "Ukendt fejl"}. Ret oplysningerne og prøv igen.` });
      } else {
        setNeedsResume(true);
        toast.error("Gemningen blev ikke afsluttet", { description: `${e.message || "Ukendt fejl"}. Prøv gemning igen — allerede gemte dele genbruges.` });
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) requestClose(); else onOpenChange(v); }}>
      <DialogContent onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); } }} className="modal-large order-create-modal planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl lg:max-w-5xl flex-col gap-0 overflow-visible rounded-md p-0 sm:max-h-[92vh]" onOpenAutoFocus={(e) => { if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault(); }}>
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
          {needsResume && <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">Gemningen blev afbrudt. Dine valg er bevaret og låst, indtil gemningen er afsluttet. Tryk ‘Prøv gemning igen’.</div>}
          <fieldset disabled={submitting || needsResume} className="min-w-0 space-y-2">
          {/* Kunde */}
          {(() => {
            const isBusiness = cvr.replace(/\D/g, "").length === 8 || !!companyName;
            return (
              <Section icon={<User className="h-3.5 w-3.5" />} tone="sky" title={isBusiness ? "Erhvervskunde" : "Kunde"} hint="Skriv email for at finde en tidligere kunde" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div id="cmo-name">
                  <Field label={isBusiness ? "Firmanavn" : "Navn"} required>
                    <Input value={customerName} aria-invalid={!!errors.name} onChange={(e) => { setCustomerName(e.target.value); clearErr("name"); }} placeholder={isBusiness ? "Fx Hansen ApS" : "Fx Mette Hansen"} className={`h-11 sm:h-10 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`} />
                    {errors.name && <p className="mt-1 text-xs font-medium text-destructive">{errors.name}</p>}
                  </Field>
                  </div>
                  <div id="cmo-email">
                  <Field label="E-mail" required>
                    <CustomerEmailAutocomplete
                      businessId={businessId}
                      value={customerEmail}
                      onChange={(v) => { setCustomerEmail(v); clearErr("email"); }}
                      onSelect={(c) => {
                        clearErr("email"); clearErr("name");
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
                      className={`h-11 sm:h-10 ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email}</p>}
                  </Field>
                  </div>
                  <Field label="Telefon">
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-11 sm:h-10" />
                  </Field>
                  {isBusiness && (
                    <Field label="Kontaktperson">
                      <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Fx Mette Hansen" className="h-11 sm:h-10" />
                    </Field>
                  )}
                  <div className={isBusiness ? "sm:col-span-2" : ""}>
                    <Field label={isBusiness ? "Service-adresse" : "Adresse"}>
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
                </div>
                <div className="mt-2">
                  {!showCvr && !(cvr.replace(/\D/g, "").length === 8 || companyName) ? (
                    <button type="button" onClick={() => setShowCvr(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 text-sm font-medium text-foreground hover:bg-secondary sm:min-h-9">
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
          <div id="cmo-services">
          {errors.services && <p className="mb-1 text-sm font-medium text-destructive">{errors.services}</p>}
          <Section tone="accent"
            icon={<ListPlus className="h-3.5 w-3.5" />}
            title="Services"
            required
            hint={items.length > 0 ? `${items.length} valgt` : undefined}
          >
            <ServicePicker
              businessId={businessId}
              services={activeServices as any}
              selectedIds={items.map((i) => i.serviceId)}
              onAdd={(id) => { addService(id); clearErr("services"); }}
              onRemove={removeItem}
              summary={<>{items.length} valgt · {fmt(totalAmount)} <span className="font-normal text-muted-foreground">uden moms</span></>}
              summaryAmount={<>{fmt(totalAmount)} uden moms</>}
              subtotalOf={(id) => { const it = items.find((x) => x.serviceId === id); return it ? fmt(roundPrice(calcItemTotal(it))) : null; }}
              renderSelected={(id) => {
                const it = items.find((x) => x.serviceId === id);
                if (!it) return null;
                const intervals = it.service.interval_options && it.service.interval_options.length > 0 ? it.service.interval_options : ["engangskøb"];
                return (
                  <div className="space-y-2.5 p-1">
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground"><Repeat className="h-3.5 w-3.5" />Interval</Label>
                      {intervals.length === 1 ? (
                        <p className="text-sm">{INTERVAL_LABELS[intervals[0]] || intervals[0]}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Interval">
                          {intervals.map((iv) => (
                            <button key={iv} type="button" role="radio" aria-checked={it.interval === iv}
                              onClick={() => updateItem(id, { interval: iv })}
                              className={`min-h-11 rounded-md border px-3 text-sm font-medium transition-colors ${it.interval === iv ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:bg-secondary"}`}>
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

                    {it.service.pricing_type === "fast_pris" && (
                      <div>
                        <Label className="mb-1.5 block text-xs font-semibold text-foreground">Antal <span className="font-normal text-muted-foreground">× {formatPrice(it.service.base_price)}{it.service.unit ? ` pr. ${it.service.unit}` : ""} uden moms</span></Label>
                        <NumberStepper value={it.quantity} min={1} max={10000} unit={it.service.unit || "stk"} ariaLabel="Antal"
                          onChange={(v) => updateItem(id, { quantity: Math.max(1, v) })} className="w-full sm:w-44" />
                      </div>
                    )}

                    {it.service.pricing_type === "prisberegner" && (it.service.calculator_steps?.length ?? 0) === 0 && (
                      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-900 dark:text-amber-100">Denne prisberegner har ingen felter — prisen bliver 0 kr. Tilføj felter under Services.</p>
                    )}

                    {it.service.pricing_type === "prisberegner" && (it.service.calculator_steps?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        {[...(it.service.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((step) => {
                          const min = Number(step.min_value ?? 0), max = Number(step.max_value ?? 100000);
                          return (
                          <div key={step.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                            <span className="min-w-0 flex-1 break-words text-xs">{step.label} <span className="text-muted-foreground">({formatPrice(step.price_per_unit)}/{step.unit})</span>
                              {step.max_value != null && <span className="block text-[11px] text-muted-foreground">{min}–{max} {step.unit}</span>}</span>
                            <NumberStepper value={it.stepValues[step.id] ?? min} min={min} max={max} step={getSmartStep(step.unit, min, max)}
                              unit={step.unit} ariaLabel={`${step.label} i ${step.unit}`}
                              onChange={(v) => updateItem(id, { stepValues: { ...it.stepValues, [step.id]: clampStep(step, v) } })}
                              className="w-full sm:w-44" />
                          </div>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <Label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent"><Calendar className="h-4 w-4" /></span>Foreløbig opstartsdato</Label>
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        {[{ l: "I dag", d: 0 }, { l: "I morgen", d: 1 }].map(({ l, d }) => {
                          const v = format(addDays(new Date(), d), "yyyy-MM-dd");
                          return (
                            <button key={l} type="button" onClick={() => setStartDate(id, v)} aria-pressed={it.startDate === v}
                              className={`min-h-11 rounded-md border px-3 text-sm font-medium transition-colors ${it.startDate === v ? "border-primary bg-primary text-primary-foreground" : "border-accent/40 bg-accent/5 hover:bg-accent/10"}`}>
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
          </div>

          {accountingError && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
              <span>Fakturainterval kunne ikke indlæses.</span>
              <Button variant="outline" className="min-h-11" onClick={() => retryAccounting()}>Prøv igen</Button>
            </div>
          )}
          {accounting?.is_active && (
            <details className="group rounded-md border border-border bg-card">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <BrandedIllustration name="invoiceInterval" className="h-14 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">Fakturainterval</span>
                  <span className="block text-sm text-muted-foreground">{invoiceValue.interval ? describeInvoiceInterval(invoiceValue) : customerInvoiceLoading || invoiceEmail !== customerEmail.trim().toLowerCase() ? "Henter kundens valg…" : customerInvoiceError ? "Brug kundens eller virksomhedens valg" : `${inheritedLabel} · ${customerInvoice ? "kundens valg" : "virksomhedens standard"}`}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border px-3 py-3">
                <p className="text-sm text-muted-foreground">Udførte besøg samles pr. kunde. Besøgsintervallet for services ændres ikke.</p>
                <InvoiceIntervalPicker value={invoiceValue} onChange={setInvoiceValue}
                  inheritLabel="Brug kundens eller virksomhedens valg"
                  inheritHint={customerInvoiceError ? "Det gældende interval bestemmes ved udførelse" : customerInvoiceLoading ? "Henter kundens valg…" : `${inheritedLabel} · ${customerInvoice ? "fra kunden" : "fra Regnskab"}`} />
                {items.length > 1 && <p className="text-xs text-muted-foreground">Dit valg gælder alle {items.length} aftaler i denne bestilling.</p>}
              </div>
            </details>
          )}

          {!showMsg && !businessMessage ? (
            <button type="button" onClick={() => setShowMsg(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 text-sm font-medium text-foreground hover:bg-secondary">
              <MessageSquare className="h-4 w-4 text-accent" />Tilføj besked til kunden
            </button>
          ) : (
          
          <Section icon={<MessageSquare className="h-3.5 w-3.5" />} tone="amber" title="Besked til kunden" hint="Valgfrit — vises i mailen">
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
          </fieldset>
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
              <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={requestClose} disabled={submitting}>
                Annullér
              </Button>
              <Button className="min-h-11 flex-1 sm:flex-none" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {submitting ? "Gemmer…" : needsResume ? "Prøv gemning igen" : "Opret bestilling"}
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