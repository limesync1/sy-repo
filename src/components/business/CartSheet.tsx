import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder, useCreateSubscription } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Package, CalendarClock, Store, ChevronLeft, CheckCircle2, Zap, CalendarDays, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Calculate next service date based on interval, anchored to a specific start date */
const calculateNextServiceDate = (interval: string, startDate?: string): string => {
  const base = startDate ? new Date(startDate) : new Date();
  switch (interval) {
    case "ugentlig": base.setDate(base.getDate() + 7); break;
    case "hver_14_dag": base.setDate(base.getDate() + 14); break;
    case "månedlig": base.setMonth(base.getMonth() + 1); break;
    case "kvartalsvis": base.setMonth(base.getMonth() + 3); break;
    case "halvårlig": base.setMonth(base.getMonth() + 6); break;
    case "årlig": base.setFullYear(base.getFullYear() + 1); break;
    default: base.setMonth(base.getMonth() + 1); break;
  }
  return base.toISOString();
};

/** Suggest tomorrow as a sensible default if user picks "select date" */
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

interface CartSheetProps {
  businessId?: string;
}

const CartSheet = ({ businessId: _businessIdProp }: CartSheetProps) => {
  const { items, removeItem, clearCart, total, count, groupedByBusiness } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const createSubscription = useCreateSubscription();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeStart, setPreferredTimeStart] = useState("");
  const [preferredTimeEnd, setPreferredTimeEnd] = useState("");
  /** "asap" = hurtigst muligt (virksomhed kontakter); "schedule" = kunden vælger dato */
  const [scheduleMode, setScheduleMode] = useState<"asap" | "schedule">("asap");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [geo, setGeo] = useState<{ ok: boolean; display?: string; lat?: number; lng?: number } | null>(null);

  // Reset verification whenever address changes
  const onAddressChange = (v: string) => { setAddress(v); setGeo(null); };
  const onZipChange = (v: string) => { setZipCode(v); setGeo(null); };
  const onCityChange = (v: string) => { setCity(v); setGeo(null); };

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
    if (!name || !email || !phone || !address || !zipCode || !city) {
      toast.error("Udfyld venligst alle felter inkl. adresse for at sende bestillingen");
      return;
    }

    // Block until address can be geocoded — protects route planner from typos
    let coords = geo?.ok ? { lat: geo.lat!, lng: geo.lng! } : null;
    if (!coords) {
      const r = await verifyAddress();
      if (!r) {
        toast.error("Vi kunne ikke finde adressen — tjek stavemåde og postnummer", {
          description: "Adressen skal være gyldig før vi kan planlægge en rute.",
        });
        return;
      }
      coords = { lat: r.lat!, lng: r.lng! };
    }

    try {
      for (const [businessId, group] of Object.entries(groupedByBusiness)) {
        const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);

        const orderResult = await createOrder.mutateAsync({
          order: {
            business_id: businessId === "unknown" ? undefined : businessId,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            address,
            zip_code: zipCode,
            city,
            latitude: coords.lat,
            longitude: coords.lng,
            preferred_date: scheduleMode === "schedule" ? (preferredDate || null) : null,
            preferred_time_start: scheduleMode === "schedule" ? (preferredTimeStart || null) : null,
            preferred_time_end: scheduleMode === "schedule" ? (preferredTimeEnd || null) : null,
            total_amount: bizTotal,
            customer_id: user?.id || null,
          },
          items: group.items.map((item) => ({
            service_id: item.serviceId,
            service_name: item.serviceName,
            quantity: item.quantity,
            unit_price: item.total,
            total_price: item.total * item.quantity,
            details: {
              description: item.details,
              interval: item.interval,
              stepDetails: item.stepDetails,
              pricingSnapshot: item.pricingSnapshot,
            },
          })),
        });

        if (user && businessId !== "unknown") {
          for (const item of group.items) {
            if (item.interval && item.interval !== "engangskøb") {
              // Anchor recurring schedule to chosen date if any, otherwise +7 days from today
              const anchor = scheduleMode === "schedule" && preferredDate
                ? preferredDate
                : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();
              const nextDate = calculateNextServiceDate(item.interval, anchor);
              await createSubscription.mutateAsync({
                customer_id: user.id,
                business_id: businessId,
                service_id: item.serviceId,
                service_name: item.serviceName,
                interval: item.interval,
                total_price: item.total,
                order_id: orderResult.id,
                next_service_date: nextDate,
                details: {
                  description: item.details,
                  stepDetails: item.stepDetails,
                  pricingSnapshot: item.pricingSnapshot,
                  startDate: anchor,
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
      toast.error("Fejl ved oprettelse af bestilling: " + e.message);
      return;
    }

    // Show success state briefly, then redirect
    setOrderSuccess(true);
    clearCart();
    setTimeout(() => {
      setOpen(false);
      setCheckout(false);
      setOrderSuccess(false);
      setName(""); setEmail(""); setPhone("");
      setAddress(""); setZipCode(""); setCity("");
      setPreferredDate(""); setPreferredTimeStart(""); setPreferredTimeEnd("");
      setScheduleMode("asap");
      if (user) {
        navigate("/min-konto");
      } else {
        toast.success("Din bestilling er sendt! Virksomheden vil gennemgå og bekræfte den.");
      }
    }, 2000);
  };

  const businessCount = Object.keys(groupedByBusiness).length;

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCheckout(false); setOrderSuccess(false); } }}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 border-accent/30 hover:bg-accent/10 hover:text-foreground hover:border-accent">
          <Package className="h-5 w-5" />
          Bestilling
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 py-4">
          <SheetHeader className="p-0">
            <SheetTitle className="text-left">
              {checkout ? (
                 <button onClick={() => setCheckout(false)} className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-foreground/80 transition-colors">
                   <ChevronLeft className="h-4 w-4" /> Bekræft bestilling
                 </button>
               ) : (
                 <div>
                   <span className="block text-base">Din bestilling</span>
                  {items.length > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "service" : "services"}{businessCount > 1 ? ` · ${businessCount} virksomheder` : ""}
                    </span>
                  )}
                </div>
              )}
            </SheetTitle>
          </SheetHeader>
        </div>

        {/* Success state */}
        {orderSuccess ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
             <h3 className="text-lg font-bold text-foreground">Bestilling sendt!</h3>
             <p className="mt-2 text-sm text-muted-foreground max-w-xs">
               Virksomheden vil gennemgå din bestilling og vende tilbage med svar.
               {user && " Du bliver nu sendt til dit kundepanel."}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
              <Package className="h-7 w-7 text-muted-foreground/30" />
            </div>
             <p className="text-sm font-medium text-foreground">Din bestilling er tom</p>
             <p className="mt-1 text-sm text-muted-foreground">Tilføj services fra virksomhedernes sider</p>
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
                      <img src={group.businessLogoUrl} alt="" className="h-7 w-7 rounded-lg object-contain bg-secondary p-0.5 border border-border" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary border border-border">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground">{group.businessName}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.serviceId} className="rounded-xl border border-border bg-card overflow-hidden">
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
                            <div className="mt-2.5 rounded-lg bg-secondary/30 divide-y divide-border/50">
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
                            <p className="text-xs text-muted-foreground mt-1.5">{item.details}</p>
                          )}

                          <p className="text-right text-sm font-bold text-foreground mt-2">{item.total} kr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{total} kr</span>
              </div>
               <Button onClick={() => setCheckout(true)} className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                 Gå til bestilling
               </Button>
            </div>
          </div>
        ) : (
          /* ── Checkout view ── */
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Contact form */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Dine oplysninger</h4>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Fulde navn</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" className="rounded-lg" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" className="rounded-lg" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefon</label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" className="rounded-lg" />
                </div>
              </div>

              {/* Service address */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Service-adresse</h4>
                <p className="text-xs text-muted-foreground -mt-1">Adressen hvor servicen skal udføres — bruges til ruteplanlægning.</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Adresse (vej + nr.)</label>
                  <Input value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="Hovedgaden 12" className="rounded-lg" />
                </div>
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Postnr.</label>
                    <Input value={zipCode} onChange={(e) => onZipChange(e.target.value)} placeholder="8600" className="rounded-lg" inputMode="numeric" maxLength={4} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">By</label>
                    <Input value={city} onChange={(e) => onCityChange(e.target.value)} placeholder="Silkeborg" className="rounded-lg" />
                  </div>
                </div>

                {/* Auto-verify status (no manual button) */}
                <div className="min-h-[24px]">
                  {verifying && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bekræfter adresse...
                    </span>
                  )}
                  {!verifying && geo?.ok && (
                    <span className="text-xs text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="truncate">{geo.display}</span>
                    </span>
                  )}
                  {!verifying && geo && !geo.ok && (
                    <span className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Kunne ikke finde — tjek stavemåde og postnr.
                    </span>
                  )}
                </div>
              </div>


              {/* Schedule mode toggle: ASAP vs choose date */}
              {(() => {
                const hasRecurring = items.some(i => i.interval && i.interval !== "engangskøb");
                const selectedDate = preferredDate ? new Date(preferredDate + "T00:00:00") : undefined;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const TIME_PRESETS = [
                  { label: "Morgen", start: "08:00", end: "12:00" },
                  { label: "Eftermiddag", start: "12:00", end: "16:00" },
                  { label: "Aften", start: "16:00", end: "20:00" },
                ];
                const activePreset = TIME_PRESETS.find(p => p.start === preferredTimeStart && p.end === preferredTimeEnd);

                return (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {hasRecurring ? "Hvornår skal første besøg være?" : "Hvornår vil du have det udført?"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {hasRecurring
                          ? "Næste besøg planlægges automatisk efter dit valgte interval."
                          : "Vælg en dato eller lad virksomheden kontakte dig hurtigst muligt."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setScheduleMode("asap"); setPreferredDate(""); setPreferredTimeStart(""); setPreferredTimeEnd(""); }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                          scheduleMode === "asap"
                            ? "border-accent bg-accent/5"
                            : "border-border bg-card hover:border-accent/40"
                        )}
                      >
                        <Zap className={cn("h-4 w-4", scheduleMode === "asap" ? "text-accent" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-foreground">Hurtigst muligt</span>
                        <span className="text-[11px] text-muted-foreground leading-tight">Virksomheden kontakter dig for aftale</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setScheduleMode("schedule"); if (!preferredDate) setPreferredDate(tomorrowISO()); }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                          scheduleMode === "schedule"
                            ? "border-accent bg-accent/5"
                            : "border-border bg-card hover:border-accent/40"
                        )}
                      >
                        <CalendarDays className={cn("h-4 w-4", scheduleMode === "schedule" ? "text-accent" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-foreground">Vælg dato</span>
                        <span className="text-[11px] text-muted-foreground leading-tight">Vælg dato og evt. tidspunkt</span>
                      </button>
                    </div>

                    {scheduleMode === "schedule" && (
                      <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                        {/* Pretty popover date picker */}
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            {hasRecurring ? "Dato for første besøg" : "Vælg dato"}
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start gap-2 rounded-lg bg-background font-normal h-10",
                                  !selectedDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarDays className="h-4 w-4 text-accent" />
                                {selectedDate
                                  ? format(selectedDate, "EEEE d. MMMM yyyy", { locale: da })
                                  : "Klik for at vælge dato"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(d) => {
                                  if (d) setPreferredDate(d.toISOString().split("T")[0]);
                                }}
                                disabled={(date) => date < today}
                                locale={da}
                                weekStartsOn={1}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Time-window quick chips */}
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Foretrukket tidsrum (valgfrit)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {TIME_PRESETS.map((p) => {
                              const active = activePreset?.label === p.label;
                              return (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => {
                                    if (active) {
                                      setPreferredTimeStart(""); setPreferredTimeEnd("");
                                    } else {
                                      setPreferredTimeStart(p.start); setPreferredTimeEnd(p.end);
                                    }
                                  }}
                                  className={cn(
                                    "rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all",
                                    active
                                      ? "border-accent bg-accent/10 text-foreground"
                                      : "border-border bg-background text-muted-foreground hover:border-accent/40"
                                  )}
                                >
                                  <div className="font-semibold">{p.label}</div>
                                  <div className="text-[10px] opacity-70">{p.start}–{p.end}</div>
                                </button>
                              );
                            })}
                          </div>
                          {(preferredTimeStart || preferredTimeEnd) && !activePreset && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground">Valgt: {preferredTimeStart}–{preferredTimeEnd}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Order summary */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bestillingsopsummering</h4>
                </div>

                {Object.entries(groupedByBusiness).map(([bizId, group]) => {
                  const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);
                  return (
                    <div key={bizId} className="border-b border-border last:border-b-0">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
                        {group.businessLogoUrl && (
                          <img src={group.businessLogoUrl} alt="" className="h-5 w-5 rounded object-contain bg-secondary p-0.5" />
                        )}
                        <span className="text-xs font-semibold text-foreground flex-1">{group.businessName}</span>
                        <span className="text-xs font-bold text-foreground">{bizTotal} kr</span>
                      </div>
                      {group.items.map((item) => (
                        <div key={item.serviceId} className="px-4 py-2 border-t border-border/50">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">{item.serviceName}</span>
                            <span className="font-semibold text-foreground">{item.total} kr</span>
                          </div>
                          {item.interval && item.interval !== "engangskøb" && (
                            <span className="text-[11px] text-accent">{INTERVAL_LABELS[item.interval]}</span>
                          )}
                          {item.stepDetails?.map((sd, i) => (
                            <div key={i} className="flex justify-between text-xs text-muted-foreground pl-2 mt-0.5">
                              <span>{sd.label}: {sd.value} {sd.unit}</span>
                              <span>{sd.subtotal} kr</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div className="px-4 py-2.5 flex justify-between bg-muted/30 border-t border-border">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{total} kr</span>
                </div>
              </div>

              {/* Info notices */}
               <p className="text-xs text-muted-foreground bg-accent/5 rounded-xl px-3.5 py-2.5 border border-accent/20">
                 💡 Bestillingen sendes til virksomheden for godkendelse. Du modtager besked når de har svaret.
               </p>

              {user && items.some(i => i.interval && i.interval !== "engangskøb") && (
                <p className="text-xs text-muted-foreground bg-accent/5 rounded-xl px-3.5 py-2.5 border border-accent/20">
                  🔄 Tilbagevendende services oprettes automatisk i dit kundepanel efter godkendelse.
                </p>
              )}
            </div>

            {/* Submit footer */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-4 space-y-2">
              <Button onClick={handleOrder} disabled={createOrder.isPending}
                className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                {createOrder.isPending ? "Sender bestilling..." : `Send bestilling – ${total} kr`}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
