import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder, useCreateSubscription } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, CalendarClock, Store, ChevronLeft, CheckCircle2, Loader2, AlertCircle, User, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [cvr, setCvr] = useState("");
  const [companyName, setCompanyName] = useState("");
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
            cvr: cvr.replace(/\D/g, "") || null,
            company_name: companyName.trim() || null,
            preferred_date: null,
            preferred_time_start: null,
            preferred_time_end: null,
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
              // Næste service-dato beregnes fra i dag — virksomhedsejer planlægger derefter i kalenderen.
              const nextDate = calculateNextServiceDate(item.interval);
              await createSubscription.mutateAsync({
                customer_id: user.id,
                business_id: businessId,
                service_id: item.serviceId,
                service_name: item.serviceName,
                interval: item.interval,
                total_price: item.total,
                order_id: orderResult.id,
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
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-sm ring-2 ring-background animate-in zoom-in-50">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 gap-0">
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
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{total} kr</span>
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
              {/* Contact form */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                    <User className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Dine oplysninger</h4>
                </div>
                <div className="space-y-2.5 pl-9">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Fulde navn</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" className="rounded-lg" />
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" className="rounded-lg" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefon</label>
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" className="rounded-lg" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Service address */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Service-adresse</h4>
                </div>
                <div className="space-y-2.5 pl-9">
                  <p className="text-xs text-muted-foreground">Adressen hvor servicen skal udføres — bruges til ruteplanlægning.</p>
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
                  <div className="min-h-[28px]">
                    {verifying && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground rounded-md bg-secondary px-2 py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bekræfter adresse...
                      </span>
                    )}
                    {!verifying && geo?.ok && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-accent rounded-md bg-accent/10 border border-accent/20 px-2 py-1 max-w-full">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{geo.display}</span>
                      </span>
                    )}
                    {!verifying && geo && !geo.ok && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Kunne ikke finde — tjek stavemåde og postnr.
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Service-intervaller vises i kurv-listen ovenfor — virksomheden planlægger besøgsdatoer i deres kalender. */}

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
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-foreground/80 bg-accent/5 rounded-xl px-3.5 py-3 border border-accent/20">
                  <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>Bestillingen sendes til virksomheden for godkendelse. Du modtager besked når de har svaret.</span>
                </div>
                {user && items.some(i => i.interval && i.interval !== "engangskøb") && (
                  <div className="flex items-start gap-2.5 text-xs text-foreground/80 bg-accent/5 rounded-xl px-3.5 py-3 border border-accent/20">
                    <CalendarClock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span>Tilbagevendende services oprettes automatisk i dit kundepanel efter godkendelse.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit footer */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-4 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total at betale</span>
                <span className="text-xl font-bold text-foreground">{total} kr</span>
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
