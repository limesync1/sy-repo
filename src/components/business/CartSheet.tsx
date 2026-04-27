import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder, useCreateSubscription } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, CalendarClock, Store, ChevronLeft, CheckCircle2, Loader2, User, MapPin, ShoppingBag, Sparkles, Building2, UserRound } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { cn } from "@/lib/utils";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";

/** Calculate next service date based on interval, anchored to today. */
const calculateNextServiceDate = (interval: string): string => {
  const base = new Date();
  switch (interval) {
    case "ugentlig": base.setDate(base.getDate() + 7); break;
    case "hver_14_dag": base.setDate(base.getDate() + 14); break;
    case "hver_4_uge": base.setDate(base.getDate() + 28); break;
    case "hver_8_uge": base.setDate(base.getDate() + 56); break;
    case "månedlig": base.setMonth(base.getMonth() + 1); break;
    case "kvartalsvis": base.setMonth(base.getMonth() + 3); break;
    case "halvårlig": base.setMonth(base.getMonth() + 6); break;
    case "årlig": base.setFullYear(base.getFullYear() + 1); break;
    default: base.setMonth(base.getMonth() + 1); break;
  }
  return base.toISOString();
};

/**
 * Global bestillings-sheet. Renderes én gang globalt (i App.tsx) og åbnes
 * automatisk når brugeren tilføjer en service via CartContext. Vi viser
 * dog også en lille flydende handle på siderne, så brugeren altid kan åbne
 * deres bestilling igen efter den er lukket.
 */
const CartSheet = () => {
  const { items, removeItem, clearCart, total, count, groupedByBusiness, sheetOpen, setSheetOpen } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const createSubscription = useCreateSubscription();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(false);
  const [customerType, setCustomerType] = useState<"private" | "business">("private");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [cvr, setCvr] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [geo, setGeo] = useState<{ ok: boolean; display?: string; lat?: number; lng?: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fyld navn/email/tlf fra brugerens profil når de åbner checkout
  useEffect(() => {
    if (!checkout || !user) return;
    if (name && email) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!email && user.email) setEmail(user.email);
      if (!name && profile?.display_name) setName(profile.display_name);
      if (!phone && profile?.phone) setPhone(profile.phone);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, user]);

  useEffect(() => {
    if (!Object.keys(errors).length) return;
    setErrors((prev) => {
      const next = { ...prev };
      if (email.trim()) delete next.email;
      if (phone.trim()) delete next.phone;
      if (address.trim() && zipCode.trim() && city.trim()) delete next.address;
      if (customerType === "private" && name.trim()) delete next.name;
      if (customerType === "business") {
        if (companyName.trim()) delete next.companyName;
        if (contactName.trim()) delete next.contactName;
      }
      return next;
    });
  }, [address, city, companyName, contactName, customerType, email, errors, name, phone, zipCode]);

  // (zip/city håndteres nu udelukkende via AddressAutocomplete)

  const verifyAddress = async (silent = false): Promise<{ lat?: number; lng?: number } | null> => {
    if (!address.trim() || !zipCode.trim() || !city.trim()) {
      if (!silent) toast.error("Udfyld adresse, postnr. og by");
      return null;
    }
    setVerifying(true);
    try {
      // Geocoding edge function builds clean DK-format display string
      const { data } = await supabase.functions.invoke("geocode-address", {
        body: { address, zip_code: zipCode, city },
      });
      if (data?.found && data.latitude && data.longitude) {
        // Use clean Danish-format display from the function
        const display = data.display_name || `${address}, ${zipCode} ${city}`;
        setGeo({ ok: true, display, lat: data.latitude, lng: data.longitude });
        return { lat: data.latitude, lng: data.longitude };
      }
      setGeo({ ok: false });
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify address as user types (debounced) — no manual button needed
  useEffect(() => {
    if (!checkout) return;
    if (!address.trim() || zipCode.trim().length < 4 || !city.trim()) return;
    if (geo) return; // already verified or failed
    const t = setTimeout(() => { verifyAddress(true); }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, zipCode, city, checkout]);

  const handleOrder = async () => {
    const nextErrors: Record<string, string> = {};
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (customerType === "private" && !name.trim()) nextErrors.name = "Indtast dit navn.";
    if (customerType === "business" && !companyName.trim()) nextErrors.companyName = "Indtast firmanavn.";
    if (customerType === "business" && !contactName.trim()) nextErrors.contactName = "Indtast kontaktperson.";
    if (!trimmedEmail) nextErrors.email = "Indtast din e-mail.";
    else if (!emailOk) nextErrors.email = "Indtast en gyldig e-mailadresse.";
    if (!trimmedPhone) nextErrors.phone = "Indtast dit telefonnummer.";
    if (!address.trim() || !zipCode.trim() || !city.trim()) nextErrors.address = "Vælg en gyldig adresse med postnummer og by.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    let coords = geo?.ok ? { lat: geo.lat!, lng: geo.lng! } : null;
    if (!coords) {
      const r = await verifyAddress();
      if (!r) {
        setErrors({ address: "Adressen kunne ikke verificeres. Vælg adressen fra listen igen." });
        return;
      }
      coords = { lat: r.lat!, lng: r.lng! };
    }

    try {
      for (const [businessId, group] of Object.entries(groupedByBusiness)) {
        const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);

        // Én ordre pr. service-linje. Første ordres id bruges som parent_order_id
        // for hele gruppen — det giver hver service sit eget kort i opgavepoolen
        // og samtidig en sammenhæng der bevares til kvittering, mail og admin.
        const parentOrderId = crypto.randomUUID();
        const childIds = group.items.map((_, i) => i === 0 ? parentOrderId : crypto.randomUUID());

        // Opret alle ordrer (én pr. service)
        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          const lineTotal = item.total * item.quantity;
          await createOrder.mutateAsync({
            order: {
              id: childIds[i],
              parent_order_id: parentOrderId,
              business_id: businessId === "unknown" ? undefined : businessId,
              customer_name: customerType === "business" && companyName ? companyName : name,
              customer_email: email,
              customer_phone: phone,
              address,
              zip_code: zipCode,
              city,
              latitude: coords.lat,
              longitude: coords.lng,
              cvr: customerType === "business" ? (cvr.replace(/\D/g, "") || null) : null,
              company_name: customerType === "business" ? (companyName.trim() || null) : null,
              preferred_date: null,
              preferred_time_start: null,
              preferred_time_end: null,
              estimated_duration_minutes: null,
              total_amount: lineTotal,
              customer_id: user?.id || null,
            },
            items: [
              {
                service_id: item.serviceId,
                service_name: item.serviceName,
                quantity: item.quantity,
                unit_price: item.total,
                total_price: lineTotal,
                details: {
                  description: item.details,
                  interval: item.interval,
                  stepDetails: item.stepDetails,
                  pricingSnapshot: item.pricingSnapshot,
                },
              },
            ],
          });
        }

        // Brug forælder-id'et til kvitteringsmail + abonnementer-link
        const orderResult = { id: parentOrderId };

        if (user && businessId !== "unknown") {
          for (let i = 0; i < group.items.length; i++) {
            const item = group.items[i];
            if (item.interval && item.interval !== "engangskøb") {
              // Næste service-dato beregnes fra i dag — virksomhedsejer planlægger derefter i kalenderen.
              const nextDate = calculateNextServiceDate(item.interval);
              await createSubscription.mutateAsync({
                customer_id: user.id,
                business_id: businessId,
                service_id: item.serviceId,
                service_name: item.serviceName,
                interval: item.interval,
                total_price: item.total,
                order_id: childIds[i],
                next_service_date: nextDate,
                // Abonnementet aktiveres først når virksomheden godkender ordren
                status: "pending",
                details: {
                  description: item.details,
                  stepDetails: item.stepDetails,
                  pricingSnapshot: item.pricingSnapshot,
                },
              });
            }
          }
        }

        // Send order confirmation email (fire-and-forget; non-blocking)
        const hasRecurring = group.items.some(
          (i) => i.interval && i.interval !== "engangskøb"
        );
        let businessInfo: any = null;
        if (businessId !== "unknown") {
          const { data: biz } = await supabase
            .from("businesses")
            .select("name, phone, email, address, city, zip_code")
            .eq("id", businessId)
            .maybeSingle();
          businessInfo = biz;
        }
        const businessAddress = businessInfo
          ? [businessInfo.address, [businessInfo.zip_code, businessInfo.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")
          : undefined;

        supabase.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "order-confirmation",
              recipientEmail: email,
              idempotencyKey: `order-confirm-${orderResult.id}`,
              templateData: {
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                businessName: group.businessName || businessInfo?.name,
                businessPhone: businessInfo?.phone,
                businessEmail: businessInfo?.email,
                businessAddress,
                orderId: orderResult.id,
                totalAmount: bizTotal,
                hasRecurring,
                items: group.items.map((item) => ({
                  name: item.serviceName,
                  quantity: item.quantity,
                  price: item.total * item.quantity,
                  interval: item.interval,
                  intervalLabel:
                    item.interval && item.interval !== "engangskøb"
                      ? INTERVAL_LABELS[item.interval] || item.interval
                      : undefined,
                  description: item.details,
                  stepDetails: item.stepDetails?.map((sd: any) => ({
                    label: sd.label,
                    value: sd.value,
                    unit: sd.unit,
                    subtotal: sd.subtotal,
                    price_per_unit: sd.price_per_unit,
                  })),
                })),
              },
            },
          })
          .catch((err) => console.warn("Email send failed (non-blocking):", err));
      }
    } catch (e: any) {
      toast.error("Bestillingen kunne ikke sendes", { description: e.message });
      return;
    }

    // Show success state briefly, then redirect
    setOrderSuccess(true);
    clearCart();
    setTimeout(() => {
      setSheetOpen(false);
      setCheckout(false);
      setOrderSuccess(false);
      setName(""); setEmail(""); setPhone("");
      setAddress(""); setZipCode(""); setCity("");
      setLatitude(null); setLongitude(null);
      setCvr(""); setCompanyName(""); setContactName("");
      setCustomerType("private");
      if (user) {
        navigate("/min-konto");
      } else {
        toast.success("Din bestilling er sendt! Virksomheden vil gennemgå og bekræfte den.");
      }
    }, 2000);
  };

  const businessCount = Object.keys(groupedByBusiness).length;

  return (
    <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) { setCheckout(false); setOrderSuccess(false); } }} modal={false}>
      <SheetContent
        hideOverlay
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="flex w-full flex-col sm:max-w-md p-0 gap-0 shadow-2xl"
      >
        {/* Header with stepper */}
        <div className="shrink-0 border-b border-border bg-card">
          <div className="px-5 py-4">
            <SheetHeader className="p-0">
              <SheetTitle className="text-left">
                {checkout ? (
                  <button onClick={() => setCheckout(false)} className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-accent transition-colors group">
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Bekræft bestilling
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <ShoppingBag className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <span className="block text-base">Din bestilling</span>
                      {items.length > 0 && (
                        <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                          {count} {count === 1 ? "service" : "services"}{businessCount > 1 ? ` · ${businessCount} virksomheder` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </SheetTitle>
            </SheetHeader>
          </div>
          {/* Step indicator — only when items exist */}
          {items.length > 0 && !orderSuccess && (
            <div className="flex items-center gap-1.5 px-5 pb-3">
              {[
                { label: "Kurv", active: !checkout, done: checkout },
                { label: "Detaljer", active: checkout, done: false },
                { label: "Bekræftet", active: false, done: false },
              ].map((step, i) => (
                <div key={i} className="flex-1 flex items-center gap-1.5">
                  <div className={cn(
                    "flex-1 h-1 rounded-full transition-colors",
                    step.done ? "bg-accent" : step.active ? "bg-accent" : "bg-border"
                  )} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success state */}
        {orderSuccess ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6 animate-in fade-in duration-300">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-4 ring-accent/20">
                <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground">Bestilling sendt! 🎉</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Virksomheden vil gennemgå din bestilling og vende tilbage med svar.
              {user && " Du bliver nu sendt til dit kundepanel."}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-semibold text-foreground">Din bestilling er tom</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-[240px]">Tilføj services fra virksomhedernes sider for at komme i gang</p>
          </div>
        ) : !checkout ? (
          /* ── Cart items view ── */
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {Object.entries(groupedByBusiness).map(([bizId, group]) => (
                <div key={bizId}>
                  {/* Business header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    {group.businessLogoUrl ? (
                      <img
                        src={group.businessLogoUrl}
                        alt=""
                        className="h-7 w-7 rounded-lg object-contain bg-secondary p-0.5 border border-border"
                        width={28}
                        height={28}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary border border-border">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground">{group.businessName}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.serviceId} className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_18px_42px_-34px_hsl(var(--foreground)/0.3)]">
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-foreground">{item.serviceName}</h4>
                              {item.interval && item.interval !== "engangskøb" && (
                                <Badge variant="secondary" className="mt-1 text-[11px] gap-1 px-2 py-0.5">
                                  <CalendarClock className="h-3 w-3" />
                                  {INTERVAL_LABELS[item.interval] || item.interval}
                                </Badge>
                              )}
                            </div>
                            <button onClick={() => removeItem(item.serviceId)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {item.stepDetails && item.stepDetails.length > 0 && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-secondary/30 divide-y divide-border/50">
                              {item.stepDetails.map((sd, i) => (
                                <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                                  <span className="text-muted-foreground">
                                    {sd.label}: <span className="text-foreground/80">{sd.value} {sd.unit}</span>
                                  </span>
                                  <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {!item.stepDetails?.length && item.details && (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.details}</p>
                          )}

                          <div className="mt-3 flex items-center justify-between rounded-[1rem] border border-accent/15 bg-accent/5 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</p>
                              <p className="text-sm font-bold text-foreground">{item.total} kr</p>
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-card text-xs font-medium text-foreground">
                              {item.interval && item.interval !== "engangskøb"
                                ? INTERVAL_LABELS[item.interval] || item.interval
                                : "Engang"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-4">
              <div className="mb-3 rounded-[1rem] border border-accent/15 bg-accent/5 px-3.5 py-3">
                <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{total} kr</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Du kan stadig tilpasse oplysninger og adresse i næste trin.</p>
              </div>
              <Button onClick={() => setCheckout(true)} size="lg" className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-sm hover:shadow-md transition-all">
                Gå til bestilling →
              </Button>
            </div>
          </div>
        ) : (
          /* ── Checkout view ── */
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Privat / Erhverv toggle — matcher CustomerEditDialog stil */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/50 p-1">
                <button
                  type="button"
                  onClick={() => setCustomerType("private")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                    customerType === "private"
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserRound className="h-4 w-4" /> Privat
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType("business")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                    customerType === "business"
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Building2 className="h-4 w-4" /> Erhverv
                </button>
              </div>

              {/* CVR-opslag — kun erhverv */}
              {customerType === "business" && (
                <section className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                      <Building2 className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Virksomhed</h4>
                  </div>
                  <div className="space-y-2.5 pl-9">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">CVR-nummer</label>
                      <CvrLookupField
                        value={cvr}
                        onChange={setCvr}
                        onResult={(r: CvrResult | null) => {
                          if (!r) return;
                          setCompanyName(r.name);
                          if (!name) setName(r.name);
                          if (r.address) setAddress(r.address);
                          if (r.zip_code) setZipCode(r.zip_code);
                          if (r.city) setCity(r.city);
                          if (r.phone && !phone) setPhone(r.phone);
                          if (r.email && !email) setEmail(r.email);
                          // Behold ikke gamle koordinater ved ny adresse — geocode på ny
                          setLatitude(null); setLongitude(null);
                          setGeo(null);
                          if (r.address && r.zip_code && r.city) {
                            setTimeout(() => { verifyAddress(true); }, 50);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Firmanavn</label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Indtastes automatisk via CVR" className="rounded-lg" />
                      {errors.companyName && <p className="mt-1 text-xs text-destructive">{errors.companyName}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Kontaktperson</label>
                      <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Fulde navn" className="rounded-lg" />
                      {errors.contactName && <p className="mt-1 text-xs text-destructive">{errors.contactName}</p>}
                    </div>
                  </div>
                </section>
              )}

              {/* Kontakt-oplysninger */}
              <section className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                    <User className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {customerType === "business" ? "Kontakt" : "Dine oplysninger"}
                  </h4>
                </div>
                <div className="space-y-2.5 pl-9">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" className="rounded-lg" />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                  {customerType === "private" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Fulde navn</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" className="rounded-lg" />
                      {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefon</label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" className="rounded-lg" />
                    {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>
              </section>

              {/* Service-adresse */}
              <section className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Service-adresse</h4>
                </div>
                <div className="space-y-2.5 pl-9">
                  <AddressAutocomplete
                    value={{ address, zip_code: zipCode, city, latitude, longitude }}
                    onChange={(v) => {
                      setAddress(v.address);
                      setZipCode(v.zip_code);
                      setCity(v.city);
                      setLatitude(v.latitude ?? null);
                      setLongitude(v.longitude ?? null);
                      if (v.latitude && v.longitude) {
                        setGeo({ ok: true, display: `${v.address}, ${v.zip_code} ${v.city}`, lat: v.latitude, lng: v.longitude });
                      } else {
                        setGeo(null);
                      }
                    }}
                  />
                  {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                  {address && zipCode && city && geo?.ok && (
                    <div className="flex items-center gap-2 text-[11px] text-foreground/70">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                      <span>Adresse verificeret</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Kompakt order summary — kun totaler pr. virksomhed */}
              <div className="overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm">
                <div className="px-4 py-2.5 bg-secondary/40 border-b border-border flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opsummering</h4>
                </div>
                {Object.entries(groupedByBusiness).map(([bizId, group]) => {
                  const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);
                  return (
                    <div key={bizId} className="px-4 py-2.5 border-b border-border/60 last:border-b-0">
                      <div className="flex items-center gap-2">
                        {group.businessLogoUrl ? (
                          <img
                            src={group.businessLogoUrl}
                            alt=""
                            className="h-5 w-5 rounded object-contain bg-secondary p-0.5 border border-border"
                            width={20}
                            height={20}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center"><Store className="h-3 w-3 text-muted-foreground" /></div>
                        )}
                        <span className="text-xs font-semibold text-foreground flex-1 truncate">{group.businessName}</span>
                        <span className="text-xs font-bold text-foreground">{bizTotal} kr</span>
                      </div>
                      <div className="mt-1 pl-7 text-[11px] text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? "service" : "services"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info-noter */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-foreground/80 bg-accent/5 rounded-xl px-3.5 py-3 border border-accent/20">
                  <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>Bestillingen sendes til virksomheden for godkendelse. Du modtager besked når de har svaret.</span>
                </div>
                {items.some(i => i.interval && i.interval !== "engangskøb") && (
                  <div className="flex items-start gap-2.5 text-xs text-foreground/80 bg-accent/5 rounded-xl px-3.5 py-3 border border-accent/20">
                    <CalendarClock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span>Tilbagevendende services planlægges automatisk efter godkendelse.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit footer */}
              <div className="shrink-0 border-t border-border bg-card px-5 py-4 space-y-2.5">
              <div className="rounded-[1rem] border border-accent/15 bg-accent/5 px-3.5 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total at betale</span>
                  <span className="text-xl font-bold text-foreground">{total} kr</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Bestillingen sendes først til virksomheden for godkendelse.</p>
              </div>
              <Button
                onClick={handleOrder}
                disabled={createOrder.isPending}
                size="lg"
                className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base shadow-sm hover:shadow-md transition-all"
              >
                {createOrder.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sender bestilling...</>
                ) : (
                  <>Send bestilling <CheckCircle2 className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
