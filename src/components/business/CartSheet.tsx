import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, CalendarClock, Store, ChevronLeft, CheckCircle2, Loader2, User, MapPin, ShoppingBag, Sparkles, Building2, UserRound, ChevronDown, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { cn } from "@/lib/utils";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import CvrLookupField, { type CvrResult } from "@/components/shared/CvrLookupField";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPrice } from "@/lib/price-format";

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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [checkout, setCheckout] = useState(false);
  // Re-entry guard: forhindrer at samme bestilling sendes flere gange,
  // hvis kunden klikker hurtigt eller har en dårlig forbindelse, og
  // checkout-flowet stadig kører de første awaits (geocoding, signup
  // osv.) før createOrder.isPending bliver true.
  const submittingRef = useRef(false);
  // Scroll-containere for hvert trin, så vi altid starter i toppen ved trinskift
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const checkoutScrollRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
  // Kunden skal aktivt acceptere handelsbetingelser og privatlivspolitik
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Sammenklappede virksomhedsgrupper i kurven — gør lange bestillinger overskuelige
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
      if (acceptedTerms) delete next.terms;
      // Vigtigt: returnér samme objekt hvis intet er ændret — ellers får
      // vi en ny reference hver render, som trigger effekten igen (loop)
      // og river brugerens scroll-position op i toppen igen og igen.
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
  }, [acceptedTerms, address, city, companyName, contactName, customerType, email, name, phone, zipCode]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
    const nextErrors: Record<string, string> = {};
    const trimmedEmail = email.trim();
    const effectiveEmail = (user?.email || trimmedEmail).trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (customerType === "private" && !name.trim()) nextErrors.name = "Indtast dit navn.";
    if (customerType === "business" && !companyName.trim()) nextErrors.companyName = "Indtast firmanavn.";
    if (customerType === "business" && !contactName.trim()) nextErrors.contactName = "Indtast kontaktperson.";
    if (!effectiveEmail) nextErrors.email = "Indtast din e-mail.";
    else if (!user && !emailOk) nextErrors.email = "Indtast en gyldig e-mailadresse.";
    if (!trimmedPhone) nextErrors.phone = "Indtast dit telefonnummer.";
    if (!address.trim() || !zipCode.trim() || !city.trim()) nextErrors.address = "Vælg en gyldig adresse med postnummer og by.";
    if (!acceptedTerms) nextErrors.terms = "Du skal acceptere handelsbetingelserne og privatlivspolitikken.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    setErrors({});

    let coords = geo?.ok ? { lat: geo.lat!, lng: geo.lng! } : null;
    if (!coords) {
      const r = await verifyAddress();
      if (!r) {
        setErrors({ address: "Adressen kunne ikke verificeres. Vælg adressen fra listen igen." });
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      coords = { lat: r.lat!, lng: r.lng! };
    }

    let activeUserId: string | null = user?.id || null;
    try {
      // Gæstebestilling: vi opretter IKKE en konto på vegne af en e-mail vi
      // ikke har verificeret (det ville tillade konto-overtagelse). Ordren
      // knyttes til e-mailen, og kunden kan selv oprette en konto bagefter.

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
              customer_email: effectiveEmail,
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
              customer_id: activeUserId,
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
              recipientEmail: effectiveEmail,
              idempotencyKey: `order-confirm-${orderResult.id}`,
              templateData: {
                customerName: name,
                customerEmail: effectiveEmail,
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
      setAcceptedTerms(false);
      if (user || activeUserId) {
        navigate("/min-konto");
      } else {
        toast.success("Din bestilling er sendt! Virksomheden vil gennemgå og bekræfte den.");
      }
    }, 2000);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const businessCount = Object.keys(groupedByBusiness).length;

  // Scroll til toppen når man skifter trin eller åbner kassen — ellers står
  // man midt i indholdet på mobil når næste trin vises.
  useEffect(() => {
    if (!sheetOpen) return;
    const el = checkout ? checkoutScrollRef.current : cartScrollRef.current;
    requestAnimationFrame(() => el?.scrollTo({ top: 0, behavior: "auto" }));
  }, [checkout, sheetOpen, orderSuccess]);

  // Vis fejl med det samme: rul kun op når der opstår NYE fejl (fx efter
  // et mislykket forsøg) — ikke hver gang errors-objektet får ny reference.
  const prevErrorKeys = useRef("");
  useEffect(() => {
    const keys = Object.keys(errors).sort().join(",");
    const hadNew = keys && keys !== prevErrorKeys.current;
    prevErrorKeys.current = keys;
    if (!hadNew) return;
    checkoutScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [errors]);

  return (
    <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) { setCheckout(false); setOrderSuccess(false); } }} modal={false}>
      <SheetContent
        hideOverlay
        side={isMobile ? "bottom" : "right"}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className={cn(
          "flex flex-col overflow-hidden overscroll-contain p-0 gap-0 shadow-2xl",
          isMobile
            ? "h-[88dvh] max-h-[88dvh] w-auto rounded-2xl"
            : "w-full sm:max-w-lg lg:max-w-xl",
        )}
      >
        {/* Grabber — visuel indikator for at panelet kan lukkes/scrolles på mobil */}
        {isMobile && (
          <div className="shrink-0 flex justify-center pt-2 pb-1 bg-card rounded-t-2xl">
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>
        )}
        {/* Header with stepper */}
        <div className="shrink-0 border-b border-border bg-card">
          <div className="px-5 py-3.5">
            <SheetHeader className="p-0">
              <SheetTitle className="text-left">
                {checkout ? (
                  <button onClick={() => setCheckout(false)} className="-ml-2 flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-base font-semibold text-foreground transition-colors hover:text-accent group">
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Tilbage til kurv
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 pr-10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <ShoppingBag className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
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
            {/* Handlingsbjælke — hurtig oprydning uden at scrolle */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/60 bg-secondary/30 px-5 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {count} valgt{businessCount > 1 ? ` · ${businessCount} virksomheder` : ""}
              </span>
              <button
                type="button"
                onClick={() => { clearCart(); toast.success("Kurven er tømt"); }}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" /> Tøm kurv
              </button>
            </div>
            <div ref={cartScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
              {Object.entries(groupedByBusiness).map(([bizId, group]) => {
                const groupTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);
                const isCollapsed = !!collapsed[bizId];
                return (
                <div key={bizId} className="space-y-2">
                  {/* Business header — klæber til toppen så man altid ved hvem man bestiller hos */}
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [bizId]: !c[bizId] }))}
                    aria-expanded={!isCollapsed}
                    className="sticky top-0 z-10 -mx-1 flex w-[calc(100%+0.5rem)] min-h-[44px] items-center gap-2.5 rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-left backdrop-blur transition-colors hover:bg-secondary/50"
                  >
                    {group.businessLogoUrl ? (
                      <img
                        src={group.businessLogoUrl}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-lg object-contain bg-secondary p-0.5 border border-border"
                        width={28}
                        height={28}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{group.businessName}</span>
                    <span className="shrink-0 text-sm font-bold text-foreground tabular-nums">{formatPrice(groupTotal)}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                  </button>

                  {/* Items */}
                  {isCollapsed ? (
                    <p className="px-3 text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? "service" : "services"} skjult — tryk for at se
                    </p>
                  ) : (
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.serviceId} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold leading-snug text-foreground">{item.serviceName}</h4>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-foreground tabular-nums">{formatPrice(item.total)}</span>
                              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[11px] font-medium">
                                {item.interval && item.interval !== "engangskøb" ? (
                                  <><CalendarClock className="h-3 w-3" />{INTERVAL_LABELS[item.interval] || item.interval}</>
                                ) : "Engangskøb"}
                              </Badge>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.serviceId)}
                            aria-label={`Fjern ${item.serviceName}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {item.stepDetails && item.stepDetails.length > 0 && (
                          <details className="group mt-2">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                              Se prisdetaljer ({item.stepDetails.length})
                            </summary>
                            <div className="mt-2 overflow-hidden rounded-xl border border-border/70 bg-secondary/30 divide-y divide-border/50">
                              {item.stepDetails.map((sd, i) => (
                                <div key={i} className="flex justify-between gap-3 px-3 py-1.5 text-xs">
                                  <span className="min-w-0 truncate text-muted-foreground">
                                    {sd.label}: <span className="text-foreground/80">{sd.value} {sd.unit}</span>
                                  </span>
                                  <span className="shrink-0 font-medium text-foreground tabular-nums">{formatPrice(sd.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {!item.stepDetails?.length && item.details && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Footer — kompakt så knappen altid er synlig, også på små skærme */}
            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-20px_hsl(var(--foreground)/0.5)]">
              <div className="mb-2.5 flex items-baseline justify-between px-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground tabular-nums">{formatPrice(total)}</span>
              </div>
              <Button onClick={() => setCheckout(true)} size="lg" className="h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-sm hover:shadow-md transition-all">
                Gå til bestilling →
              </Button>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Oplysninger og adresse udfyldes i næste trin.</p>
            </div>
          </div>
        ) : (
          /* ── Checkout view ── */
          <div className="flex flex-1 flex-col min-h-0">
            <div ref={checkoutScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
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
                  <div className="space-y-4 pl-0 sm:pl-9">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">CVR-nummer</label>
                      <p className="mb-1.5 text-xs text-muted-foreground">Vi henter automatisk firmanavn og adresse.</p>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Firmanavn</label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Udfyldes automatisk efter CVR-opslag" className="h-11 rounded-lg text-base sm:text-sm" />
                        {errors.companyName && <p className="mt-1 text-xs text-destructive">{errors.companyName}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Kontaktperson</label>
                        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Fulde navn" className="h-11 rounded-lg text-base sm:text-sm" />
                        {errors.contactName && <p className="mt-1 text-xs text-destructive">{errors.contactName}</p>}
                      </div>
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
                <div className="grid gap-4 pl-0 sm:pl-9 sm:grid-cols-2">
                  {customerType === "private" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Fulde navn</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" className="h-11 rounded-lg text-base sm:text-sm" />
                      {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                    </div>
                  )}
                  <div className={cn(customerType === "business" && "sm:col-span-1")}>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" className="h-11 rounded-lg text-base sm:text-sm" />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Telefon</label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" className="h-11 rounded-lg text-base sm:text-sm" />
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
                <div className="space-y-2.5 pl-0 sm:pl-9">
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
                        <span className="text-xs font-bold text-foreground">{formatPrice(bizTotal)}</span>
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

              {/* Accept af handelsbetingelser — krav før bestilling kan sendes */}
              <label
                htmlFor="cart-accept-terms"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[1.25rem] border bg-card p-4 shadow-sm transition-colors",
                  errors.terms ? "border-destructive/60 bg-destructive/5" : "border-border hover:bg-secondary/40",
                )}
              >
                <input
                  id="cart-accept-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  aria-invalid={!!errors.terms}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-border accent-[hsl(var(--accent))]"
                />
                <span className="text-xs leading-5 text-foreground/80">
                  Jeg accepterer{" "}
                  <a href="/vilkaar" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                    handelsbetingelserne
                  </a>{" "}
                  og{" "}
                  <a href="/privatlivspolitik" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                    privatlivspolitikken
                  </a>
                  , og at mine oplysninger deles med den valgte virksomhed, så bestillingen kan behandles.
                  {errors.terms && <span className="mt-1 block font-medium text-destructive">{errors.terms}</span>}
                </span>
              </label>
            </div>

            {/* Submit footer */}
              <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 shadow-[0_-8px_24px_-20px_hsl(var(--foreground)/0.5)]">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground tabular-nums">{formatPrice(total)}</span>
              </div>
              <Button
                onClick={handleOrder}
                disabled={createOrder.isPending || submitting}
                size="lg"
                className="h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base shadow-sm hover:shadow-md transition-all"
              >
                {createOrder.isPending || submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sender bestilling...</>
                ) : (
                  <>Send bestilling <CheckCircle2 className="h-4 w-4" /></>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Sendes til virksomheden for godkendelse — ingen betaling nu.</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
