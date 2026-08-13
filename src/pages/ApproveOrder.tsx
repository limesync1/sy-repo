import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, AlertCircle, CheckCircle2, Building2, MapPin, Calendar, Phone, Mail, ShoppingBag } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { INTERVAL_LABELS } from "@/types/service";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";

const fmt = (n: number) =>
  new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(n || 0);

type OrderRow = {
  id: string;
  business_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  total_amount: number;
  preferred_date: string | null;
  preferred_time_start: string | null;
  notes: string | null;
  business_message: string | null;
  status: string;
  requires_customer_approval: boolean;
  customer_response: string | null;
  approval_expires_at: string | null;
  order_items?: Array<{
    id: string;
    service_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    details: any;
  }>;
};

type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
};

const ApproveOrder = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"accepted" | "rejected" | null>(null);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [message, setMessage] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orderId || !token) {
        setError("Manglende ordrenummer eller godkendelseslink. Tjek at du har klikket på det fulde link i mailen.");
        setLoading(false);
        return;
      }
      // Bestillinger er ikke offentligt læsbare. RPC'en verificerer selv at
      // token'et matcher ordren, så ordre-id alene kan ikke afsløre data.
      const { data: res, error: err } = await (supabase as any).rpc("get_order_for_approval", {
        p_order_id: orderId,
        p_token: token,
      });
      if (cancelled) return;
      if (err || !res?.order) {
        setError("Vi kunne ikke finde bestillingen. Linket er muligvis udløbet eller allerede brugt.");
        setLoading(false);
        return;
      }
      const mergedOrder = {
        ...res.order,
        order_items: res.items || [],
        total_amount: Number(res.total_amount || 0),
      };
      setOrder(mergedOrder as any);
      if (res.business) setBusiness(res.business as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId, token]);

  const expiresLabel = useMemo(() => {
    if (!order?.approval_expires_at) return null;
    try {
      return format(parseISO(order.approval_expires_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: da });
    } catch { return null; }
  }, [order]);

  const submit = async (decision: "accepted" | "rejected") => {
    if (!token) return;
    setSubmitting(decision);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("customer-approve-order", {
        body: { token, decision, message: message.trim() || undefined },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(decision);
    } catch (e: any) {
      setError(e.message === "expired"
        ? "Linket er desværre udløbet. Kontakt virksomheden direkte."
        : e.message === "already_processed"
          ? "Denne bestilling er allerede behandlet."
          : "Noget gik galt. Prøv igen, eller kontakt virksomheden direkte.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <SEO
        title="Godkend bestilling — Serviceydere"
        description="Gennemgå og godkend bestillingen din leverandør har sendt til dig på Serviceydere."
        canonicalPath="/godkend-bestilling"
      />
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 md:py-12">
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Henter bestilling…</p>
          </Card>
        ) : error && !order ? (
          <Card className="p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <h1 className="text-xl font-bold text-foreground mb-2">Kunne ikke åbne bestilling</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button asChild variant="outline"><Link to="/">Til forsiden</Link></Button>
          </Card>
        ) : done ? (
          <Card className="p-8 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${done === "accepted" ? "bg-accent/15" : "bg-secondary"}`}>
              {done === "accepted"
                ? <CheckCircle2 className="h-8 w-8 text-accent" strokeWidth={2.5} />
                : <X className="h-8 w-8 text-muted-foreground" strokeWidth={2.5} />}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {done === "accepted" ? "Tak — bestillingen er godkendt 🎉" : "Bestillingen er afvist"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {done === "accepted"
                ? `${business?.name || "Virksomheden"} har modtaget din godkendelse og kontakter dig med næste skridt.`
                : `Vi har givet ${business?.name || "virksomheden"} besked. Tag fat i dem direkte hvis du ønsker at justere bestillingen.`}
            </p>
            <Button asChild><Link to="/">Til forsiden</Link></Button>
          </Card>
        ) : order && !order.requires_customer_approval ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-accent mb-3" />
            <h1 className="text-xl font-bold text-foreground mb-2">Bestillingen er allerede behandlet</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Denne bestilling er enten allerede godkendt, afvist eller udløbet.
              {order.customer_response === "accepted" && " Du har tidligere godkendt den."}
            </p>
            <Button asChild variant="outline"><Link to="/">Til forsiden</Link></Button>
          </Card>
        ) : order ? (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/10">
                Afventer din godkendelse
              </Badge>
              <h1 className="mt-3 text-2xl md:text-3xl font-bold text-foreground">
                Du har en bestilling til godkendelse
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {business?.name || "Virksomheden"} har oprettet en bestilling til dig.
                Gennemgå detaljerne nedenfor og godkend eller afvis.
              </p>
            </div>

            {/* Business card */}
            {business && (
              <Card className="p-4 flex items-center gap-3">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt=""
                    className="h-12 w-12 rounded-lg object-contain bg-secondary p-1 border"
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{business.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {business.phone && <a href={`tel:${business.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="h-3 w-3" />{business.phone}</a>}
                    {business.email && <a href={`mailto:${business.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="h-3 w-3" />{business.email}</a>}
                  </div>
                </div>
              </Card>
            )}

            {/* Message from business */}
            {order.business_message && (
              <Card className="p-4 border-l-4 border-l-accent">
                <p className="text-xs font-medium text-muted-foreground mb-1">Besked fra {business?.name || "virksomheden"}</p>
                <p className="text-sm text-foreground italic">"{order.business_message}"</p>
              </Card>
            )}

            {/* Order details */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 bg-secondary/50 border-b flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Bestillingens indhold</span>
              </div>
              <div className="p-4 space-y-3">
                {(order.order_items || []).map((item) => {
                  const intervalLabel = item.details?.interval && item.details.interval !== "engangskøb"
                    ? INTERVAL_LABELS[item.details.interval] || item.details.interval : null;
                  return (
                    <div key={item.id} className="flex items-start justify-between gap-3 pb-3 last:pb-0 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.service_name}</p>
                        {intervalLabel && (
                          <Badge variant="outline" className="mt-1 text-[11px] gap-1">🔄 {intervalLabel}</Badge>
                        )}
                        {item.details?.stepDetails?.map((sd: any, i: number) => (
                          <p key={i} className="mt-1 text-xs text-muted-foreground">
                            • {sd.label}: <span className="font-medium text-foreground">{sd.value} {sd.unit}</span>
                            {sd.subtotal != null && ` — ${fmt(sd.subtotal)}`}
                          </p>
                        ))}
                        {!item.details?.stepDetails?.length && item.details?.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.details.description}</p>
                        )}
                      </div>
                      <p className="font-semibold text-foreground tabular-nums">{fmt(Number(item.total_price))}</p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-semibold text-foreground">I alt</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">{fmt(Number(order.total_amount))}</span>
                </div>
              </div>
            </Card>

            {/* Service info */}
            {(order.address || order.preferred_date) && (
              <Card className="p-4 space-y-2">
                {order.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-foreground">
                      {order.address}{order.zip_code || order.city ? `, ${[order.zip_code, order.city].filter(Boolean).join(" ")}` : ""}
                    </span>
                  </div>
                )}
                {order.preferred_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground">
                      {format(parseISO(order.preferred_date), "EEEE d. MMMM yyyy", { locale: da })}
                      {order.preferred_time_start && ` kl. ${order.preferred_time_start.slice(0, 5)}`}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {expiresLabel && (
              <p className="text-center text-xs text-muted-foreground">
                Linket udløber {expiresLabel}
              </p>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {showRejectBox ? (
              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium">Hvorfor afviser du? <span className="text-muted-foreground font-normal">(valgfrit)</span></p>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Fx: Jeg vil gerne ændre dato, eller jeg har valgt en anden løsning…"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowRejectBox(false); setMessage(""); }}>
                    Tilbage
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => submit("rejected")} disabled={!!submitting}>
                    {submitting === "rejected" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Bekræft afvisning
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sticky bottom-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setShowRejectBox(true)}
                  disabled={!!submitting}
                >
                  <X className="h-4 w-4 mr-2" /> Afvis bestilling
                </Button>
                <Button
                  className="flex-1 h-12 bg-foreground hover:bg-foreground/90 text-background"
                  onClick={() => submit("accepted")}
                  disabled={!!submitting}
                >
                  {submitting === "accepted"
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Check className="h-4 w-4 mr-2" />}
                  Godkend bestilling ({fmt(Number(order.total_amount))})
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default ApproveOrder;