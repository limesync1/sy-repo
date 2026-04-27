import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, MapPin, Mail, Phone, Loader2, Inbox, Search, TrendingUp, Trophy, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";

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
  new:        { label: "Ny",         className: "bg-accent/15 text-accent border-accent/20" },
  viewed:     { label: "Set",        className: "bg-secondary text-foreground border-border" },
  contacted:  { label: "Kontaktet",  className: "bg-blue-50 text-blue-700 border-blue-200" },
  won:        { label: "Vundet",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined:   { label: "Afvist",     className: "bg-muted text-muted-foreground border-border" },
};

/** Mailto-template som åbner kundens mail-klient med en pæn intro fra
 *  virksomheden. Når den klikkes markerer vi automatisk leadet som
 *  "Kontaktet", så virksomheden ikke behøver at skifte status manuelt. */
const buildMailtoUrl = (lead: Lead) => {
  const qr = lead.quote_request;
  if (!qr || !qr.customer_email) return null;
  const subject = `Tilbud fra Serviceydere — ${qr.category}`;
  const body =
`Hej ${qr.customer_name || ""},

Tak for din forespørgsel via Serviceydere. Vi har modtaget din opgave:

"${qr.description}"

${lead.estimated_price ? `Vores foreløbige estimat: ${lead.estimated_price}\n\n` : ""}Vi vil meget gerne hjælpe og hører gerne fra dig hvis du har spørgsmål eller vil have et endeligt tilbud.

Venlig hilsen`;
  return `mailto:${qr.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/* ─── Analytics card — sidste 30 dage ─── */
const LeadsAnalyticsCard = ({ leads }: { leads: Lead[] }) => {
  const stats = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = leads.filter((l) => new Date(l.created_at).getTime() >= cutoff);
    const total = recent.length;
    const engaged = recent.filter((l) => l.status === "viewed" || l.status === "contacted" || l.status === "won").length;
    const contacted = recent.filter((l) => l.status === "contacted" || l.status === "won").length;
    const won = recent.filter((l) => l.status === "won").length;
    const conversion = total > 0 ? Math.round((engaged / total) * 100) : 0;
    const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;

    const catCount = new Map<string, number>();
    recent.forEach((l) => {
      const c = l.quote_request?.category;
      if (!c) return;
      catCount.set(c, (catCount.get(c) || 0) + 1);
    });
    const topCategories = [...catCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, engaged, contacted, won, conversion, contactRate, topCategories };
  }, [leads]);

  if (stats.total === 0) return null;

  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Sidste 30 dage
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Nye leads</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {stats.conversion}<span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground">Set / kontaktet</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {stats.contactRate}<span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground">Kontakt-rate</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{stats.won}</p>
            <p className="text-xs text-muted-foreground">Vundne aftaler</p>
          </div>
        </div>
        {stats.topCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">Top kategorier:</span>
            {stats.topCategories.map(([cat, n]) => (
              <Badge key={cat} variant="secondary" className="gap-1 rounded-md">
                {cat} <span className="text-muted-foreground">· {n}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LeadsTab = ({ businessId }: { businessId: string }) => {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  /** Åbner kundens mail-program OG markerer leadet som "Kontaktet" — så
   *  virksomheden slipper for at skifte status manuelt bagefter. */
  const handleSendMessage = async (lead: Lead) => {
    const url = buildMailtoUrl(lead);
    if (!url) {
      toast.error("Kunden har ikke delt en e-mail");
      return;
    }
    // Optimistically flip to contacted
    if (lead.status !== "contacted" && lead.status !== "won") {
      setLeads((prev) => prev?.map((l) => l.id === lead.id ? { ...l, status: "contacted" } : l) ?? null);
      const { error } = await supabase
        .from("quote_request_matches")
        .update({ status: "contacted", responded_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (error) console.error(error);
    }
    window.location.href = url;
  };

  const allLeads = leads || [];

  // Counts pr. status
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allLeads.length, active: 0, new: 0, viewed: 0, contacted: 0, won: 0, declined: 0 };
    allLeads.forEach((l) => {
      c[l.status] = (c[l.status] || 0) + 1;
      if (l.status !== "declined" && l.status !== "won") c.active += 1;
    });
    return c;
  }, [allLeads]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach((l) => { if (l.quote_request?.category) set.add(l.quote_request.category); });
    return Array.from(set).sort();
  }, [allLeads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeads.filter((l) => {
      // status filter
      if (filter === "active" && (l.status === "declined" || l.status === "won")) return false;
      if (filter !== "active" && filter !== "all" && l.status !== filter) return false;
      // category filter
      if (categoryFilter !== "all" && l.quote_request?.category !== categoryFilter) return false;
      // search
      if (!q) return true;
      const qr = l.quote_request;
      return (
        (qr?.customer_name || "").toLowerCase().includes(q) ||
        (qr?.customer_email || "").toLowerCase().includes(q) ||
        (qr?.description || "").toLowerCase().includes(q) ||
        (qr?.city || "").toLowerCase().includes(q) ||
        (qr?.zip_code || "").toLowerCase().includes(q) ||
        (qr?.category || "").toLowerCase().includes(q)
      );
    });
  }, [allLeads, filter, categoryFilter, search]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description={`${allLeads.length} leads i alt${counts.new ? ` · ${counts.new} nye` : ""}`}
      />

      {/* Stats — samme stil som Aftaler */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aktive leads</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{counts.active || 0}</p>
          </CardContent>
        </Card>
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nye (ikke set)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{counts.new || 0}</p>
          </CardContent>
        </Card>
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vundne aftaler</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{counts.won || 0}</p>
          </CardContent>
        </Card>
      </div>

      <LeadsAnalyticsCard leads={allLeads} />

      {allLeads.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Ingen leads endnu"
          description="Når en kunde bruger ‘Indhent 3 tilbud’ og vores AI matcher jer, vises forespørgslen her."
        />
      ) : (
        <>
          {/* Søgefelt */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg efter kunde, e-mail, beskrivelse, by eller kategori..."
              className="h-10 pl-9 rounded-lg"
            />
          </div>

          {/* Status-chips */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            {(() => {
              type Chip = { key: string; label: string; count: number; tone?: "danger" };
              const groups: Chip[][] = [
                [
                  { key: "active", label: "Aktive", count: counts.active || 0 },
                  { key: "all", label: "Alle", count: counts.all || 0 },
                ],
                ([
                  { key: "new", label: "Nye", count: counts.new || 0, tone: "danger" as const },
                ] as Chip[]).filter((b) => b.count > 0),
                [
                  { key: "viewed", label: "Set", count: counts.viewed || 0 },
                  { key: "contacted", label: "Kontaktet", count: counts.contacted || 0 },
                  { key: "won", label: "Vundet", count: counts.won || 0 },
                  { key: "declined", label: "Afvist", count: counts.declined || 0 },
                ],
              ].filter((g) => g.length > 0);
              return groups.map((group, gi) => (
                <div key={gi} className="flex flex-wrap items-center gap-1.5">
                  {gi > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-border/80" />}
                  {group.map(({ key, label, count, tone }) => {
                    const isActive = filter === key;
                    const toneRing = tone === "danger" && count > 0 ? "before:bg-destructive" : "";
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          toneRing ? `before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full ${toneRing} pl-5` : ""
                        } ${
                          isActive
                            ? "border-foreground/30 bg-foreground text-background shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`tabular-nums rounded-md px-1.5 text-[10px] font-semibold ${
                          isActive ? "bg-background/15 text-background" : "bg-secondary text-foreground/70"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ));
            })()}

            {allCategories.length > 1 && (
              <div className="ml-auto flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle kategorier</SelectItem>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="Ingen leads matcher"
              description="Prøv et andet filter eller en anden søgning."
            />
          ) : (
            <div className="space-y-3">
              {visible.map((l) => {
        const qr = l.quote_request;
        const status = STATUS_LABELS[l.status] ?? STATUS_LABELS.new;
        const share = qr?.share_contact !== false;
        const canMessage = share && !!qr?.customer_email;
        return (
          <Card key={l.id} className="surface-admin rounded-xl border-border/80 shadow-sm transition-colors hover:border-border">
            <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${status.className} border rounded-md`}>{status.label}</Badge>
                  <Badge variant="outline" className="gap-1 rounded-md"><Sparkles className="h-3 w-3" /> {l.match_score}/100</Badge>
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
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{qr.description}</p>
                )}
                {l.estimated_price && (
                  <p className="mt-2 text-sm"><span className="text-muted-foreground">Estimat:</span> <span className="font-medium text-foreground">{l.estimated_price}</span></p>
                )}
                {l.reason && (
                  <p className="mt-1 text-xs italic text-muted-foreground">“{l.reason}”</p>
                )}
                {share && qr && (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <a href={`mailto:${qr.customer_email}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-secondary">
                      <Mail className="h-4 w-4" /> {qr.customer_email}
                    </a>
                    {qr.customer_phone && (
                      <a href={`tel:${qr.customer_phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-secondary">
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
                {canMessage && (
                  <Button
                    size="sm"
                    onClick={() => handleSendMessage(l)}
                    className="h-9 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Mail className="h-4 w-4" /> Send mail
                  </Button>
                )}
                {l.status !== "won" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(l.id, "won")}
                    className="h-9 gap-1.5"
                  >
                    <Trophy className="h-4 w-4" /> Marker som vundet
                  </Button>
                )}
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
            </CardContent>
          </Card>
        );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeadsTab;
