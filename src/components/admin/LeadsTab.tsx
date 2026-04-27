import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, MapPin, Mail, Phone, Loader2, Inbox, Search, TrendingUp, Trophy, Filter,
  Flame, Clock, Brain, CheckCircle2, XCircle, ChevronRight, Zap, Target, Lightbulb,
  ArrowUpRight, Calendar, MessageSquare,
} from "lucide-react";
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
  viewed_at?: string | null;
  responded_at?: string | null;
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
  new:        { label: "Ny",         className: "bg-accent/15 text-accent border-accent/30" },
  viewed:     { label: "Set",        className: "bg-secondary text-foreground border-border" },
  contacted:  { label: "Kontaktet",  className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900" },
  won:        { label: "Vundet",     className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" },
  declined:   { label: "Afvist",     className: "bg-muted text-muted-foreground border-border" },
};

/* ─── AI Priority scoring ─── */
type Priority = "hot" | "warm" | "cold";

const computePriority = (l: Lead): { priority: Priority; score: number; signals: string[] } => {
  const signals: string[] = [];
  let score = l.match_score || 50;

  const ageHours = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
  if (ageHours < 2) { score += 15; signals.push("Helt frisk (<2t)"); }
  else if (ageHours < 24) { score += 8; signals.push("Frisk i dag"); }
  else if (ageHours > 72) { score -= 10; signals.push("Mere end 3 dage gammel"); }

  if (l.quote_request?.share_contact && l.quote_request.customer_phone) {
    score += 8; signals.push("Telefon delt");
  }
  if (l.quote_request?.share_contact && l.quote_request.customer_email) {
    score += 4;
  }
  if (typeof l.distance_km === "number" && l.distance_km < 10) {
    score += 6; signals.push("Tæt på (<10km)");
  }
  const desc = l.quote_request?.description || "";
  if (/(haster|hurtigst|asap|akut|i dag|i morgen|denne uge)/i.test(desc)) {
    score += 12; signals.push("Kunden har travlt");
  }
  if (desc.length > 120) { score += 3; signals.push("Detaljeret forespørgsel"); }
  if (l.estimated_price) score += 2;

  score = Math.max(0, Math.min(100, score));

  let priority: Priority = "cold";
  if (score >= 80) priority = "hot";
  else if (score >= 60) priority = "warm";

  return { priority, score, signals };
};

const PRIORITY_META: Record<Priority, { label: string; icon: React.ReactNode; cls: string; ring: string }> = {
  hot:  { label: "Hot lead",  icon: <Flame className="h-3 w-3" />, cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900", ring: "ring-2 ring-orange-200/60 dark:ring-orange-900/40" },
  warm: { label: "Warm",      icon: <Zap className="h-3 w-3" />,   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900", ring: "" },
  cold: { label: "Kold",      icon: <Clock className="h-3 w-3" />, cls: "bg-muted text-muted-foreground border-border", ring: "" },
};

/* ─── AI Insight bar ─── */
const AIInsightCard = ({ leads }: { leads: (Lead & { _p: ReturnType<typeof computePriority> })[] }) => {
  const insights = useMemo(() => {
    if (leads.length === 0) return [];
    const hot = leads.filter((l) => l._p.priority === "hot" && l.status !== "won" && l.status !== "declined");
    const stale = leads.filter((l) => {
      const ageH = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
      return ageH > 24 && l.status === "viewed";
    });
    const unread = leads.filter((l) => l.status === "new");
    const items: { icon: React.ReactNode; text: string; tone: string }[] = [];
    if (hot.length > 0) items.push({
      icon: <Flame className="h-4 w-4 text-orange-500" />,
      text: `Du har ${hot.length} hot lead${hot.length > 1 ? "s" : ""} der bør kontaktes nu`,
      tone: "text-orange-700 dark:text-orange-300",
    });
    if (unread.length > 0) items.push({
      icon: <Sparkles className="h-4 w-4 text-accent" />,
      text: `${unread.length} ulæst${unread.length > 1 ? "e" : ""} forespørgsel — gennemse dem først`,
      tone: "text-foreground",
    });
    if (stale.length > 0) items.push({
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      text: `${stale.length} lead${stale.length > 1 ? "s" : ""} er set men ikke kontaktet — følg op`,
      tone: "text-amber-700 dark:text-amber-300",
    });
    if (items.length === 0) items.push({
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      text: "Du er ajour med alle leads — godt arbejde!",
      tone: "text-emerald-700 dark:text-emerald-300",
    });
    return items;
  }, [leads]);

  if (insights.length === 0) return null;

  return (
    <Card className="surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border/80 bg-gradient-to-r from-accent/5 via-transparent to-transparent px-4 py-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">AI-anbefalinger</span>
          <Badge variant="outline" className="ml-auto rounded-md text-[10px] font-medium uppercase">Live</Badge>
        </div>
        <ul className="divide-y divide-border/60">
          {insights.map((it, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="shrink-0">{it.icon}</span>
              <span className={`flex-1 ${it.tone}`}>{it.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

/* ─── Stat card ─── */
const StatCard = ({ label, value, sub, icon, tone }: {
  label: string; value: string | number; sub?: string; icon?: React.ReactNode; tone?: "accent" | "warn" | "ok" | "default";
}) => {
  const toneCls = tone === "accent" ? "text-accent" : tone === "warn" ? "text-orange-500" : tone === "ok" ? "text-emerald-600" : "text-muted-foreground";
  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon && <span className={toneCls}>{icon}</span>}
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
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
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("smart");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_request_matches")
      .select("id, match_score, reason, estimated_price, distance_km, status, business_note, created_at, viewed_at, responded_at, quote_request:quote_requests(id, customer_name, customer_email, customer_phone, category, description, city, zip_code, share_contact, created_at)")
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

  const handleSendMessage = async (lead: Lead) => {
    const url = buildMailtoUrl(lead);
    if (!url) { toast.error("Kunden har ikke delt en e-mail"); return; }
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

  // Enrich with AI priority
  const enriched = useMemo(
    () => allLeads.map((l) => ({ ...l, _p: computePriority(l) })),
    [allLeads]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allLeads.length, active: 0, new: 0, viewed: 0, contacted: 0, won: 0, declined: 0, hot: 0 };
    enriched.forEach((l) => {
      c[l.status] = (c[l.status] || 0) + 1;
      if (l.status !== "declined" && l.status !== "won") c.active += 1;
      if (l._p.priority === "hot" && l.status !== "won" && l.status !== "declined") c.hot += 1;
    });
    return c;
  }, [enriched, allLeads.length]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach((l) => { if (l.quote_request?.category) set.add(l.quote_request.category); });
    return Array.from(set).sort();
  }, [allLeads]);

  // Conversion stats
  const convStats = useMemo(() => {
    const total = allLeads.length;
    const won = allLeads.filter((l) => l.status === "won").length;
    const contacted = allLeads.filter((l) => l.status === "contacted" || l.status === "won").length;
    const responseTimes = allLeads
      .filter((l) => l.responded_at)
      .map((l) => (new Date(l.responded_at!).getTime() - new Date(l.created_at).getTime()) / 3600000);
    const avgRespHours = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    return {
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
      contactRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
      avgRespHours,
    };
  }, [allLeads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = enriched.filter((l) => {
      if (filter === "active" && (l.status === "declined" || l.status === "won")) return false;
      if (filter !== "active" && filter !== "all" && l.status !== filter) return false;
      if (categoryFilter !== "all" && l.quote_request?.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && l._p.priority !== priorityFilter) return false;
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
    if (sortBy === "smart") {
      list = list.sort((a, b) => b._p.score - a._p.score);
    } else if (sortBy === "newest") {
      list = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      list = list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "match") {
      list = list.sort((a, b) => b.match_score - a.match_score);
    }
    return list;
  }, [enriched, filter, categoryFilter, priorityFilter, search, sortBy]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description={`${allLeads.length} leads i alt${counts.new ? ` · ${counts.new} nye` : ""}${counts.hot ? ` · ${counts.hot} hot` : ""}`}
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aktive leads" value={counts.active || 0} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Hot leads" value={counts.hot || 0} sub="AI-prioriteret" icon={<Flame className="h-4 w-4" />} tone={counts.hot > 0 ? "warn" : "default"} />
        <StatCard
          label="Konvertering"
          value={`${convStats.conversionRate}%`}
          sub={`${convStats.contactRate}% kontaktet`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="ok"
        />
        <StatCard
          label="Svartid (snit)"
          value={convStats.avgRespHours > 0 ? (convStats.avgRespHours < 1 ? `${Math.round(convStats.avgRespHours * 60)}m` : `${convStats.avgRespHours.toFixed(1)}t`) : "—"}
          sub="Hurtigere = flere aftaler"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <AIInsightCard leads={enriched} />

      {allLeads.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Ingen leads endnu"
          description="Når en kunde bruger 'Indhent 3 tilbud' og vores AI matcher jer, vises forespørgslen her."
        />
      ) : (
        <>
          {/* Toolbar: search + sort */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg efter kunde, e-mail, beskrivelse, by eller kategori..."
                className="h-10 pl-9 rounded-lg"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-full rounded-lg sm:w-[200px]">
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart sortering (AI)</SelectItem>
                <SelectItem value="newest">Nyeste først</SelectItem>
                <SelectItem value="oldest">Ældste først</SelectItem>
                <SelectItem value="match">Højeste match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            {(() => {
              type Chip = { key: string; label: string; count: number; tone?: "danger" | "hot" };
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
                    const showDot = tone === "danger" && count > 0;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          showDot ? "before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-destructive pl-5" : ""
                        } ${
                          isActive
                            ? "border-foreground/30 bg-foreground text-background shadow-sm hover:bg-foreground/90"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`tabular-nums rounded-md px-1.5 text-[10px] font-semibold ${
                          isActive ? "bg-background/20 text-background" : "bg-secondary text-foreground/70"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ));
            })()}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Al prioritet</SelectItem>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="warm">⚡ Warm</SelectItem>
                  <SelectItem value="cold">🕒 Kold</SelectItem>
                </SelectContent>
              </Select>
              {allCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle kategorier</SelectItem>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
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
                const pmeta = PRIORITY_META[l._p.priority];
                const ageH = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
                const isHot = l._p.priority === "hot" && l.status !== "won" && l.status !== "declined";
                return (
                  <Card
                    key={l.id}
                    className={`surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md ${
                      isHot ? "ring-1 ring-orange-200/60 dark:ring-orange-900/40" : ""
                    }`}
                  >
                    <CardContent className="p-0">
                      {/* Top accent bar for hot leads */}
                      {isHot && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:from-orange-950/40 dark:to-transparent dark:text-orange-300">
                          <Flame className="h-3 w-3" /> AI anbefaler: kontakt nu
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {/* Badge row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`${status.className} border rounded-md`}>{status.label}</Badge>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={`gap-1 rounded-md border ${pmeta.cls} cursor-help`}>
                                    {pmeta.icon} {pmeta.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1.5">
                                    <p className="font-semibold">AI-prioritet: {l._p.score}/100</p>
                                    {l._p.signals.length > 0 ? (
                                      <ul className="space-y-0.5 text-xs">
                                        {l._p.signals.map((s, i) => (
                                          <li key={i} className="flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3 w-3" /> {s}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs opacity-80">Ingen særlige signaler</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="gap-1 rounded-md cursor-help">
                                    <Sparkles className="h-3 w-3" /> {l.match_score}/100
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Match-score baseret på kategori, område og kapacitet</p>
                                </TooltipContent>
                              </Tooltip>

                              {qr?.category && <Badge variant="secondary" className="rounded-md">{qr.category}</Badge>}

                              {(qr?.zip_code || qr?.city) && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {[qr.zip_code, qr.city].filter(Boolean).join(" ")}
                                  {typeof l.distance_km === "number" && ` • ~${Math.round(l.distance_km)} km`}
                                </span>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                    <Calendar className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: da })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">{new Date(l.created_at).toLocaleString("da-DK")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            <h3 className="mt-2.5 text-base font-semibold text-foreground">{qr?.customer_name || "Anonym kunde"}</h3>
                            {qr?.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{qr.description}</p>
                            )}
                            {l.estimated_price && (
                              <p className="mt-2 text-sm">
                                <span className="text-muted-foreground">Estimat: </span>
                                <span className="font-semibold text-foreground">{l.estimated_price}</span>
                              </p>
                            )}
                            {l.reason && (
                              <div className="mt-2 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-2.5 text-xs">
                                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                                <p className="text-foreground/80"><span className="font-medium text-foreground">AI-match:</span> {l.reason}</p>
                              </div>
                            )}
                            {share && qr && (
                              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                <a href={`mailto:${qr.customer_email}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-foreground/20 hover:bg-secondary">
                                  <Mail className="h-3.5 w-3.5" /> {qr.customer_email}
                                </a>
                                {qr.customer_phone && (
                                  <a href={`tel:${qr.customer_phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-foreground/20 hover:bg-secondary">
                                    <Phone className="h-3.5 w-3.5" /> {qr.customer_phone}
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

                          {/* Action column */}
                          <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                            {/* Match strength bar */}
                            <div className="rounded-lg border border-border/80 bg-card p-2.5">
                              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <span>AI-prioritet</span>
                                <span className="tabular-nums text-foreground">{l._p.score}</span>
                              </div>
                              <Progress value={l._p.score} className="h-1.5" />
                            </div>

                            {canMessage && (
                              <Button
                                size="sm"
                                onClick={() => handleSendMessage(l)}
                                className="h-9 gap-1.5"
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
                            {l.status !== "declined" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateStatus(l.id, "declined")}
                                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Afvis
                              </Button>
                            )}
                          </div>
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
    </TooltipProvider>
  );
};

export default LeadsTab;
