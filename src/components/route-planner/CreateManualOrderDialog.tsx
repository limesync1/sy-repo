import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServices } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Send, ShoppingBag, User, MapPin, Calendar as CalendarIcon, MessageSquare, Package } from "lucide-react";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { roundPrice, buildPricingSnapshot } from "@/lib/service-pricing";
import { DatePickerField } from "@/components/route-planner/DatePickerField";

type CalcStep = { id: string; label: string; unit: string; price_per_unit: number; min_value: number | null; max_value: number | null; default_value: number | null; sort_order: number | null };
type Service = { id: string; name: string; description: string | null; pricing_type: "fast_pris" | "timepris" | "prisberegner"; base_price: number | null; unit: string | null; is_active: boolean | null; interval_options: string[] | null; calculator_steps?: CalcStep[]; business_id: string };

interface BuilderItem {
  serviceId: string;
  service: Service;
  hours: number;
  stepValues: Record<string, number>;
  interval: string;
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
}

const CreateManualOrderDialog = ({ open, onOpenChange, businessId, businessName }: Props) => {
  const { data: services = [] } = useServices(businessId);
  const activeServices = useMemo(() => (services as any[]).filter((s) => s.is_active !== false) as Service[], [services]);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");

  // Cart
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = useMemo(() => roundPrice(items.reduce((s, it) => s + calcItemTotal(it), 0)), [items]);

  const addService = (serviceId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc || items.some((i) => i.serviceId === serviceId)) return;
    const stepValues: Record<string, number> = {};
    (svc.calculator_steps || []).forEach((s) => { stepValues[s.id] = Number(s.default_value ?? s.min_value ?? 0); });
    const intervals = svc.interval_options && svc.interval_options.length > 0 ? svc.interval_options : ["engangskøb"];
    setItems((prev) => [...prev, { serviceId, service: svc, hours: 1, stepValues, interval: intervals[0] }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.serviceId !== id));

  const updateItem = (id: string, patch: Partial<BuilderItem>) =>
    setItems((prev) => prev.map((i) => i.serviceId === id ? { ...i, ...patch } : i));

  const reset = () => {
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone("");
    setAddress(""); setZipCode(""); setCity("");
    setPreferredDate(""); setBusinessMessage("");
    setItems([]);
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Udfyld kundens navn og email");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
      toast.error("Ugyldig email-adresse");
      return;
    }
    if (items.length === 0) {
      toast.error("Tilføj mindst én service til bestillingen");
      return;
    }

    setSubmitting(true);
    try {
      // Try to geocode if address present
      let lat: number | null = null;
      let lng: number | null = null;
      if (address.trim() && (zipCode.trim() || city.trim())) {
        try {
          const { data: geo } = await supabase.functions.invoke("geocode-address", {
            body: { address: address.trim(), zip_code: zipCode.trim(), city: city.trim() },
          });
          if (geo?.found) { lat = geo.latitude; lng = geo.longitude; }
        } catch { /* non-blocking */ }
      }

      // Build approval token + expiry
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const expires = new Date(); expires.setDate(expires.getDate() + 7);
      const orderId = crypto.randomUUID();

      // Insert order
      const { error: orderErr } = await supabase.from("orders").insert({
        id: orderId,
        business_id: businessId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone.trim() || null,
        address: address.trim() || null,
        zip_code: zipCode.trim() || null,
        city: city.trim() || null,
        latitude: lat,
        longitude: lng,
        preferred_date: preferredDate || null,
        total_amount: totalAmount,
        status: "pending",
        business_message: businessMessage.trim() || null,
        approval_token: token,
        approval_expires_at: expires.toISOString(),
        requires_customer_approval: true,
      });
      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = items.map((it) => {
        const total = roundPrice(calcItemTotal(it));
        const stepDetails = (it.service.calculator_steps || []).map((s) => ({
          id: s.id, label: s.label, value: it.stepValues[s.id] || 0, unit: s.unit,
          price_per_unit: Number(s.price_per_unit),
          subtotal: roundPrice((it.stepValues[s.id] || 0) * Number(s.price_per_unit)),
        }));
        const description = it.service.pricing_type === "timepris"
          ? `${it.hours} timer`
          : it.service.pricing_type === "fast_pris" ? "Fast pris" : "";
        return {
          order_id: orderId,
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

      // Send approval email
      const approvalUrl = `${window.location.origin}/godkend-bestilling/${orderId}?token=${token}`;
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, phone, email")
        .eq("id", businessId)
        .maybeSingle();

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "manual-order-approval",
          recipientEmail: customerEmail.trim().toLowerCase(),
          idempotencyKey: `manual-order-${orderId}`,
          templateData: {
            customerName: customerName.trim(),
            businessName: biz?.name || businessName,
            businessPhone: biz?.phone,
            businessEmail: biz?.email,
            businessMessage: businessMessage.trim() || undefined,
            orderId,
            approvalUrl,
            expiresInDays: 7,
            address: address.trim()
              ? `${address.trim()}${zipCode.trim() || city.trim() ? `, ${[zipCode.trim(), city.trim()].filter(Boolean).join(" ")}` : ""}`
              : undefined,
            preferredDate: preferredDate || undefined,
            totalAmount,
            items: items.map((it) => ({
              name: it.service.name,
              quantity: 1,
              price: roundPrice(calcItemTotal(it)),
              intervalLabel: it.interval && it.interval !== "engangskøb" ? INTERVAL_LABELS[it.interval] || it.interval : undefined,
              description: it.service.pricing_type === "timepris" ? `${it.hours} timer` : undefined,
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

      toast.success("Bestilling oprettet — kunden har modtaget en mail med godkendelseslink");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Kunne ikke oprette bestilling: " + (e.message || "Ukendt fejl"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onOpenChange(v); else if (v) onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-3.5 border-b bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            </span>
            Opret bestilling for kunde
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vælg services fra dit katalog og udfyld kundens oplysninger. Kunden modtager en mail med et godkendelses-link — bestillingen aktiveres først når de godkender.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-secondary/20">
          {/* Kunde */}
          <Section icon={<User className="h-3.5 w-3.5" />} title="Kunde" required>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Navn" required>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Fx Mette Hansen" className="h-9" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="kunde@email.dk" className="h-9" />
              </Field>
              <Field label="Telefon">
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+45 22 33 44 55" className="h-9" />
              </Field>
            </div>
          </Section>

          {/* Adresse */}
          <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Adresse" hint="Valgfrit — bruges til ruteplanlægning">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3"><Field label="Vejnavn"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Vesterbrogade 12, 2.tv" className="h-9" /></Field></div>
              <Field label="Postnr."><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="2200" className="h-9" /></Field>
              <div className="sm:col-span-2"><Field label="By"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="København N" className="h-9" /></Field></div>
            </div>
          </Section>

          {/* Foreslået dato */}
          <Section icon={<CalendarIcon className="h-3.5 w-3.5" />} title="Foreslået dato" hint="Valgfrit — kunden kan bekræfte eller ændre">
            <DatePickerField value={preferredDate} onChange={setPreferredDate} />
          </Section>

          {/* Services */}
          <Section icon={<Package className="h-3.5 w-3.5" />} title="Services" required hint={`${items.length} valgt`}>
            <Select value="" onValueChange={addService}>
              <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Tilføj service fra dit katalog…" /></SelectTrigger>
              <SelectContent>
                {activeServices.length === 0 && <SelectItem value="__none" disabled>Ingen services oprettet endnu</SelectItem>}
                {activeServices.filter((s) => !items.some((i) => i.serviceId === s.id)).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {items.length > 0 && (
              <div className="mt-3 space-y-2">
                {items.map((it) => {
                  const intervals = it.service.interval_options && it.service.interval_options.length > 0 ? it.service.interval_options : ["engangskøb"];
                  return (
                    <Card key={it.serviceId} className="p-3 bg-background border-l-2 border-l-primary/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm leading-tight">{it.service.name}</p>
                          <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                            {it.service.pricing_type === "fast_pris" ? "Fast pris" : it.service.pricing_type === "timepris" ? "Timepris" : "Prisberegner"}
                          </Badge>
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
                        <div className="flex items-center gap-2 mb-2 text-xs">
                          <Label className="text-xs text-muted-foreground">Timer</Label>
                          <Input
                            type="number" min={0.5} max={24} step={0.5} value={it.hours}
                            onChange={(e) => updateItem(it.serviceId, { hours: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                            className="h-7 w-20"
                          />
                          <span className="text-muted-foreground">× {it.service.base_price} kr</span>
                        </div>
                      )}

                      {it.service.pricing_type === "prisberegner" && (it.service.calculator_steps?.length ?? 0) > 0 && (
                        <div className="space-y-1.5 mb-2 rounded-md bg-secondary/40 p-2">
                          {[...(it.service.calculator_steps || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((step) => (
                            <div key={step.id} className="flex items-center gap-2 text-xs">
                              <span className="flex-1 truncate">{step.label} <span className="text-muted-foreground">({step.price_per_unit} kr/{step.unit})</span></span>
                              <Input type="number" min={Number(step.min_value ?? 0)} max={Number(step.max_value ?? 9999)}
                                value={it.stepValues[step.id] ?? 0}
                                onChange={(e) => updateItem(it.serviceId, { stepValues: { ...it.stepValues, [step.id]: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                className="h-7 w-20" />
                              <span className="text-muted-foreground w-8 text-right">{step.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {intervals.length > 1 && (
                        <Select value={it.interval} onValueChange={(v) => updateItem(it.serviceId, { interval: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {intervals.map((iv) => <SelectItem key={iv} value={iv} className="text-xs">{INTERVAL_LABELS[iv] || iv}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}

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

        {/* Sticky footer med total + CTA */}
        <DialogFooter className="border-t bg-background px-5 py-3 shrink-0 sm:items-center sm:justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">I alt</span>
            <span className="text-xl font-bold tabular-nums">{fmt(totalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} size="sm">Annullér</Button>
            <Button onClick={handleSubmit} disabled={submitting || items.length === 0} size="sm">
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Send til godkendelse
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ───────── Small layout helpers ───────── */

const Section = ({
  icon, title, hint, required, children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="bg-background rounded-lg border p-3.5">
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      {required && <span className="text-[10px] text-destructive">*</span>}
      {hint && <span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-[11px] text-muted-foreground font-medium">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {children}
  </div>
);

export default CreateManualOrderDialog;