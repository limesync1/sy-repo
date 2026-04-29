import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MapPin, Mail, Phone, Loader2, Inbox, Search, TrendingUp, Trophy, Filter,
  Clock, XCircle, Target,
  Calendar, StickyNote, Bell, BellRing, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { LeadDetailDialog, type LeadDetailLead } from "@/components/admin/LeadDetailDialog";

type Lead = LeadDetailLead & { viewed_at?: string | null; responded_at?: string | null };

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:        { label: "Ny",         className: "bg-accent/15 text-accent border-accent/30" },
  viewed:     { label: "Set",        className: "bg-secondary text-foreground border-border" },
  contacted:  { label: "Kontaktet",  className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900" },
  won:        { label: "Vundet",     className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" },
  declined:   { label: "Afvist",     className: "bg-muted text-muted-foreground border-border" },
};

type Priority = "hot" | "warm" | "cold";

/**
 * computePriority — bruges KUN internt til smart sortering. Vi viser ikke
 * scoren eller "hot/warm/cold" i UI'et længere; det skabte mere forvirring
 * end værdi for ejeren. Logikken bevares, men holdes usynlig.
 */
const computePriority = (l: Lead): { priority: Priority; score: number; signals: string[] } => {
  const signals: string[] = [];
  let score = l.match_score || 50;
  const ageHours = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
  if (ageHours < 2) { score += 15; signals.push("Helt frisk (<2t)"); }
  else if (ageHours < 24) { score += 8; signals.push("Frisk i dag"); }
  else if (ageHours > 72) { score -= 10; signals.push("Mere end 3 dage gammel"); }
  if (l.quote_request?.share_contact && l.quote_request.customer_phone) { score += 8; signals.push("Telefon delt"); }
  if (l.quote_request?.share_contact && l.quote_request.customer_email) { score += 4; }
  if (typeof l.distance_km === "number" && l.distance_km < 10) { score += 6; signals.push("Tæt på (<10km)"); }
  const desc = l.quote_request?.description || "";
  if (/(haster|hurtigst|asap|akut|i dag|i morgen|denne uge)/i.test(desc)) { score += 12; signals.push("Kunden har travlt"); }
  if (desc.length > 120) { score += 3; signals.push("Detaljeret forespørgsel"); }
  if (l.estimated_price) score += 2;
  score = Math.max(0, Math.min(100, score));
  let priority: Priority = "cold";
  if (score >= 80) priority = "hot";
  else if (score >= 60) priority = "warm";
  return { priority, score, signals };
};

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
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_request_matches")
      .select("id, match_score, reason, estimated_price, distance_km, status, business_note, ai_draft, ai_draft_generated_at, follow_up_at, created_at, viewed_at, responded_at, quote_request:quote_requests(id, customer_name, customer_email, customer_phone, category, description, city, zip_code, share_contact, created_at)")
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

  // Auto-mark "new" leads as "viewed"
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

  const bulkUpdate = async (status: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ status, responded_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error("Kunne ikke opdatere"); return; }
    setLeads((prev) => prev?.map((l) => ids.includes(l.id) ? { ...l, status } : l) ?? null);
    setSelected(new Set());
    toast.success(`${ids.length} leads opdateret`);
  };

  const allLeads = leads || [];
  const enriched = useMemo(() => allLeads.map((l) => ({ ...l, _p: computePriority(l) })), [allLeads]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allLeads.length, active: 0, new: 0, viewed: 0, contacted: 0, won: 0, declined: 0, hot: 0, dueFollowUps: 0 };
    enriched.forEach((l) => {
      c[l.status] = (c[l.status] || 0) + 1;
      if (l.status !== "declined" && l.status !== "won") c.active += 1;
      if (l._p.priority === "hot" && l.status !== "won" && l.status !== "declined") c.hot += 1;
      if (l.follow_up_at && new Date(l.follow_up_at).getTime() <= Date.now() && l.status !== "won" && l.status !== "declined") c.dueFollowUps += 1;
    });
    return c;
  }, [enriched, allLeads.length]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    allLeads.forEach((l) => { if (l.quote_request?.category) set.add(l.quote_request.category); });
    return Array.from(set).sort();
  }, [allLeads]);

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
      if (filter === "followup") {
        if (!l.follow_up_at) return false;
        if (l.status === "won" || l.status === "declined") return false;
      } else if (filter !== "active" && filter !== "all" && l.status !== filter) return false;
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
        (qr?.category || "").toLowerCase().includes(q) ||
        (l.business_note || "").toLowerCase().includes(q)
      );
    });
    if (sortBy === "smart") list = list.sort((a, b) => {
      // Due follow-ups first
      const aDue = a.follow_up_at && new Date(a.follow_up_at).getTime() <= Date.now() ? 1 : 0;
      const bDue = b.follow_up_at && new Date(b.follow_up_at).getTime() <= Date.now() ? 1 : 0;
      if (aDue !== bDue) return bDue - aDue;
      return b._p.score - a._p.score;
    });
    else if (sortBy === "newest") list = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "oldest") list = list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === "match") list = list.sort((a, b) => b.match_score - a.match_score);
    return list;
  }, [enriched, filter, categoryFilter, priorityFilter, search, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((l) => l.id)));
  };

  const openLead = enriched.find((l) => l.id === openId) || null;
  const onLeadChange = (updated: LeadDetailLead) => {
    setLeads((prev) => prev?.map((l) => l.id === updated.id ? { ...l, ...updated } : l) ?? null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        <PageHeader
          title="Leads"
          description={`${allLeads.length} leads i alt${counts.new ? ` · ${counts.new} nye` : ""}${counts.hot ? ` · ${counts.hot} hot` : ""}${counts.dueFollowUps ? ` · ${counts.dueFollowUps} opfølgning${counts.dueFollowUps > 1 ? "er" : ""}` : ""}`}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Aktive leads" value={counts.active || 0} icon={<Target className="h-4 w-4" />} />
          <StatCard label="Hot leads" value={counts.hot || 0} sub="AI-prioriteret" icon={<Flame className="h-4 w-4" />} tone={counts.hot > 0 ? "warn" : "default"} />
          <StatCard label="Konvertering" value={`${convStats.conversionRate}%`} sub={`${convStats.contactRate}% kontaktet`} icon={<TrendingUp className="h-4 w-4" />} tone="ok" />
          <StatCard label="Svartid (snit)" value={convStats.avgRespHours > 0 ? (convStats.avgRespHours < 1 ? `${Math.round(convStats.avgRespHours * 60)}m` : `${convStats.avgRespHours.toFixed(1)}t`) : "—"} sub="Hurtigere = flere aftaler" icon={<Clock className="h-4 w-4" />} />
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
            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg efter kunde, e-mail, beskrivelse, by, kategori eller note..."
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
                type Chip = { key: string; label: string; count: number; tone?: "danger" | "warn" };
                const groups: Chip[][] = [
                  [
                    { key: "active", label: "Aktive", count: counts.active || 0 },
                    { key: "all", label: "Alle", count: counts.all || 0 },
                  ],
                  ([
                    { key: "followup", label: "Opfølg", count: counts.dueFollowUps || 0, tone: "warn" as const },
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
                      const dotCls = tone === "danger" ? "before:bg-destructive" : tone === "warn" ? "before:bg-orange-500" : "";
                      const showDot = !!tone && count > 0;
                      return (
                        <button
                          key={key}
                          onClick={() => setFilter(key)}
                          className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            showDot ? `before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full ${dotCls} pl-5` : ""
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

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-foreground/20 bg-foreground/95 px-4 py-2.5 text-background shadow-lg backdrop-blur">
                <span className="text-sm font-medium">{selected.size} valgt</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => bulkUpdate("contacted")}>
                    <Mail className="h-3.5 w-3.5" /> Marker kontaktet
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => bulkUpdate("won")}>
                    <Trophy className="h-3.5 w-3.5" /> Vundet
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-destructive" onClick={() => bulkUpdate("declined")}>
                    <XCircle className="h-3.5 w-3.5" /> Afvis
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-background hover:bg-background/10" onClick={() => setSelected(new Set())}>
                    Annuller
                  </Button>
                </div>
              </div>
            )}

            {visible.length === 0 ? (
              <EmptyState icon={<Search />} title="Ingen leads matcher" description="Prøv et andet filter eller en anden søgning." />
            ) : (
              <>
                {/* Select-all bar */}
                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === visible.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Vælg alle"
                  />
                  <span>Vælg alle synlige ({visible.length})</span>
                </div>

                <div className="space-y-3">
                  {visible.map((l) => {
                    const qr = l.quote_request;
                    const status = STATUS_LABELS[l.status] ?? STATUS_LABELS.new;
                    const share = qr?.share_contact !== false;
                    const pmeta = PRIORITY_META[l._p.priority];
                    const isHot = l._p.priority === "hot" && l.status !== "won" && l.status !== "declined";
                    const isDue = !!l.follow_up_at && new Date(l.follow_up_at).getTime() <= Date.now() && l.status !== "won" && l.status !== "declined";
                    const isSelected = selected.has(l.id);

                    return (
                      <Card
                        key={l.id}
                        onClick={(e) => {
                          // Don't open if clicking checkbox or interactive elements
                          const t = e.target as HTMLElement;
                          if (t.closest('button, a, input, [role="checkbox"]')) return;
                          setOpenId(l.id);
                        }}
                        className={`surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer ${
                          isSelected ? "ring-2 ring-foreground/30" : isDue ? "ring-1 ring-destructive/40" : isHot ? "ring-1 ring-orange-200/60 dark:ring-orange-900/40" : ""
                        }`}
                      >
                        <CardContent className="p-0">
                          {/* Top accent banners */}
                          {isDue && (
                            <div className="flex items-center gap-2 bg-destructive/10 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                              <BellRing className="h-3 w-3" /> Opfølgning forfalden — {formatDistanceToNow(new Date(l.follow_up_at!), { addSuffix: true, locale: da })}
                            </div>
                          )}
                          {!isDue && isHot && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:from-orange-950/40 dark:to-transparent dark:text-orange-300">
                              <Flame className="h-3 w-3" /> AI anbefaler: kontakt nu
                            </div>
                          )}
                          <div className="flex gap-3 p-5">
                            {/* Selection checkbox */}
                            <div className="pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(l.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Vælg lead"
                              />
                            </div>

                            <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={`${status.className} border rounded-md pointer-events-none`}>{status.label}</Badge>

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

                                  {qr?.category && <Badge variant="secondary" className="rounded-md pointer-events-none">{qr.category}</Badge>}

                                  {l.ai_draft && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="gap-1 rounded-md border-accent/40 text-accent cursor-help">
                                          <Brain className="h-3 w-3" /> Udkast klar
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">AI-svar er genereret og klar til at sende</p></TooltipContent>
                                    </Tooltip>
                                  )}

                                  {l.follow_up_at && !isDue && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="gap-1 rounded-md cursor-help">
                                          <Bell className="h-3 w-3" /> {formatDistanceToNow(new Date(l.follow_up_at), { addSuffix: true, locale: da })}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">Opfølgning sat: {new Date(l.follow_up_at).toLocaleString("da-DK")}</p></TooltipContent>
                                    </Tooltip>
                                  )}

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
                                    <TooltipContent><p className="text-xs">{new Date(l.created_at).toLocaleString("da-DK")}</p></TooltipContent>
                                  </Tooltip>
                                </div>

                                <h3 className="mt-2.5 text-base font-semibold text-foreground">{qr?.customer_name || "Anonym kunde"}</h3>
                                {qr?.description && (
                                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-foreground/80">{qr.description}</p>
                                )}
                                {l.estimated_price && (
                                  <p className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Estimat: </span>
                                    <span className="font-semibold text-foreground">{l.estimated_price}</span>
                                  </p>
                                )}
                                {l.business_note && (
                                  <div className="mt-2 flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-2 text-xs">
                                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <p className="line-clamp-2 text-foreground/80">{l.business_note}</p>
                                  </div>
                                )}
                                {share && qr && (
                                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                    <a
                                      href={`mailto:${qr.customer_email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-foreground/20 hover:bg-secondary"
                                    >
                                      <Mail className="h-3.5 w-3.5" /> {qr.customer_email}
                                    </a>
                                    {qr.customer_phone && (
                                      <a
                                        href={`tel:${qr.customer_phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-foreground/20 hover:bg-secondary"
                                      >
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
                              <div className="flex shrink-0 flex-col gap-2 sm:w-48" onClick={(e) => e.stopPropagation()}>
                                <div className="rounded-lg border border-border/80 bg-card p-2.5">
                                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <span>AI-prioritet</span>
                                    <span className="tabular-nums text-foreground">{l._p.score}</span>
                                  </div>
                                  <Progress value={l._p.score} className="h-1.5" />
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() => setOpenId(l.id)}
                                  className="h-9 gap-1.5"
                                >
                                  <MessageSquare className="h-4 w-4" /> Åbn & svar
                                </Button>
                                {l.status !== "won" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(l.id, "won")}
                                    className="h-8 gap-1.5"
                                  >
                                    <Trophy className="h-3.5 w-3.5" /> Vundet
                                  </Button>
                                )}
                                {l.status !== "declined" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateStatus(l.id, "declined")}
                                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
              </>
            )}
          </>
        )}

        <LeadDetailDialog
          lead={openLead}
          open={!!openId}
          onOpenChange={(v) => !v && setOpenId(null)}
          onChange={onLeadChange}
        />
      </div>
    </TooltipProvider>
  );
};

export default LeadsTab;
