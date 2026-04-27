import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, MapPin, Mail, Phone, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Lead = {
  id: string;
  match_score: number;
  reason: string | null;
  estimated_price: string | null;
  distance_km: number | null;
  status: string;
  business_note: string | null;
  created_at: string;
  quote_request: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    category: string;
    description: string;
    city: string | null;
    zip_code: string | null;
    share_contact: boolean;
    created_at: string;
  } | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:        { label: "Ny",         className: "bg-accent/15 text-accent" },
  viewed:     { label: "Set",        className: "bg-secondary text-foreground" },
  contacted:  { label: "Kontaktet",  className: "bg-blue-100 text-blue-700" },
  won:        { label: "Vundet",     className: "bg-green-100 text-green-700" },
  declined:   { label: "Afvist",     className: "bg-muted text-muted-foreground" },
};

const LeadsTab = ({ businessId }: { businessId: string }) => {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_request_matches")
      .select("id, match_score, reason, estimated_price, distance_km, status, business_note, created_at, quote_request:quote_requests(id, customer_name, customer_email, customer_phone, category, description, city, zip_code, share_contact, created_at)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      toast.error("Kunne ikke hente leads");
      setLeads([]);
    } else {
      setLeads((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  // Auto-mark "new" leads as "viewed" when first opened
  useEffect(() => {
    if (!leads) return;
    const newIds = leads.filter((l) => l.status === "new").map((l) => l.id);
    if (newIds.length === 0) return;
    supabase
      .from("quote_request_matches")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .in("id", newIds)
      .then(({ error }) => { if (error) console.error(error); });
  }, [leads]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Kunne ikke opdatere"); return; }
    setLeads((prev) => prev?.map((l) => l.id === id ? { ...l, status } : l) ?? null);
    toast.success("Lead opdateret");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!leads || leads.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground">Ingen leads endnu</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Når en kunde bruger "Indhent 3 tilbud" og vores AI matcher jer, vises forespørgslen her.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((l) => {
        const qr = l.quote_request;
        const status = STATUS_LABELS[l.status] ?? STATUS_LABELS.new;
        const share = qr?.share_contact !== false;
        return (
          <Card key={l.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={status.className}>{status.label}</Badge>
                  <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> {l.match_score}/100</Badge>
                  {qr?.category && <Badge variant="secondary">{qr.category}</Badge>}
                  {(qr?.zip_code || qr?.city) && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {[qr.zip_code, qr.city].filter(Boolean).join(" ")}
                      {typeof l.distance_km === "number" && ` • ~${Math.round(l.distance_km)} km`}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: da })}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{qr?.customer_name || "Anonym kunde"}</h3>
                {qr?.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{qr.description}</p>
                )}
                {l.estimated_price && (
                  <p className="mt-2 text-sm"><span className="text-muted-foreground">Estimat:</span> <span className="font-medium text-foreground">{l.estimated_price}</span></p>
                )}
                {l.reason && (
                  <p className="mt-1 text-xs italic text-muted-foreground">"{l.reason}"</p>
                )}
                {share && qr && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <a href={`mailto:${qr.customer_email}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                      <Mail className="h-4 w-4" /> {qr.customer_email}
                    </a>
                    {qr.customer_phone && (
                      <a href={`tel:${qr.customer_phone}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                        <Phone className="h-4 w-4" /> {qr.customer_phone}
                      </a>
                    )}
                  </div>
                )}
                {!share && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Kunden har ikke delt direkte kontaktinfo — svar via platformen.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Ny</SelectItem>
                    <SelectItem value="viewed">Set</SelectItem>
                    <SelectItem value="contacted">Kontaktet</SelectItem>
                    <SelectItem value="won">Vundet</SelectItem>
                    <SelectItem value="declined">Afvist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LeadsTab;
