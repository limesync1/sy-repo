import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { PaginationFooter } from "@/components/admin/shared/PaginationFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MapPin, Mail, Phone, Loader2, Inbox, Search, Trophy, Filter,
  Clock, XCircle,
  Calendar, StickyNote, Bell, BellRing, MessageSquare, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { PageHeader, EmptyState, StatCard } from "@/components/admin/shared/AdminUI";
import { PageSkeleton } from "@/components/admin/shared/Skeletons";
import { LeadDetailDialog, type LeadDetailLead } from "@/components/admin/LeadDetailDialog";
import MetaLeadsSetup from "@/components/admin/MetaLeadsSetup";
import LeadSettingsDialog from "@/components/admin/LeadSettingsDialog";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { LeadSourceDashboard } from "@/components/admin/LeadSourceDashboard";

type Lead = LeadDetailLead & { viewed_at?: string | null; responded_at?: string | null };

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:        { label: "Ny",         className: "bg-accent/15 text-accent border-accent/30" },
  viewed:     { label: "Set",        className: "bg-secondary text-foreground border-border" },
  contacted:  { label: "Kontaktet",  className: "bg-accent/10 text-foreground border-accent/30" },
  won:        { label: "Vundet",     className: "bg-success/10 text-success border-success/30" },
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

/** Hver forbundet Facebook-side og Instagram-konto får sin egen indbakke-nøgle. */
const leadAccount = (l: Lead): { key: string; label: string; source: string } | null => {
  const qr = l.quote_request;
  const source = qr?.source || "serviceydere";
  if (source !== "facebook" && source !== "instagram") return null;
  const md = (qr?.source_metadata || {}) as Record<string, any>;
  if (source === "instagram") {
    const ig = md.instagram_name || md.page_name || "Instagram";
    return { key: `instagram:${md.instagram_id || md.page_id || ig}`, label: md.instagram_name ? `@${md.instagram_name}` : ig, source };
  }
  return { key: `facebook:${md.page_id || md.page_name || "side"}`, label: md.page_name || "Facebook-side", source };
};

const LeadsTab = ({ businessId }: { businessId: string }) => {
  const qc = useQueryClient();
  const leadsKey = ["leads", businessId] as const;
  const { data: leads, isLoading: loading, error: leadsError, refetch: refetchLeads, isFetching: fetchingLeads } = useQuery({
    queryKey: leadsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_request_matches")
        .select("id, match_score, reason, estimated_price, distance_km, status, business_note, ai_draft, ai_draft_generated_at, follow_up_at, created_at, viewed_at, responded_at, customer_id, quote_request:quote_requests(id, customer_name, category, description, city, zip_code, share_contact, created_at, source, source_channel, external_form_id, external_campaign_id, source_metadata)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data as any) as Lead[]).filter((l) => l.quote_request);
    },
    enabled: !!businessId,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 5000),
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Nye leads vises automatisk, så snart de ankommer.
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`leads-${businessId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_request_matches", filter: `business_id=eq.${businessId}` }, () => {
        qc.invalidateQueries({ queryKey: leadsKey });
        toast.success("Nyt lead modtaget");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
  const setLeads = (updater: (prev: Lead[] | null) => Lead[] | null) => {
    qc.setQueryData<Lead[]>(leadsKey, (prev) => updater(prev ?? null) ?? []);
  };
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const accounts = useMemo(() => {
    const map = new Map<string, { key: string; label: string; source: string; total: number; customers: number; won: number }>();
    for (const l of leads || []) {
      const a = leadAccount(l);
      if (!a) continue;
      const cur = map.get(a.key) || { ...a, total: 0, customers: 0, won: 0 };
      cur.total += 1;
      if (l.customer_id) cur.customers += 1;
      if (l.status === "won") cur.won += 1;
      map.set(a.key, cur);
    }
    return [...map.values()].sort((x, y) => y.total - x.total);
  }, [leads]);
  const [sortBy, setSortBy] = useState<string>("smart");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch customer contact details (email/phone) via secure RPC for leads
  // where the customer agreed to share contact. Direct table access to
  // these columns is revoked at the database level to prevent leaks.
  useEffect(() => {
    if (!leads) return;
    const toFetch = leads.filter(
      (l) => l.quote_request?.share_contact && l.quote_request?.id &&
        (l.quote_request as any).customer_email === undefined
    );
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = Array.from(new Set(toFetch.map((l) => l.quote_request!.id)));
      const { data, error } = await (supabase as any).rpc("get_quote_request_contacts", {
        p_ids: ids,
      });
      if (cancelled) return;
      const byId = new Map<string, any>();
      for (const row of (data || []) as any[]) {
        byId.set(row.quote_request_id, row);
      }
      // Ved fejl markeres kontakt som null, så vi ikke prøver i en uendelig løkke.
      setLeads((prev) =>
        (prev ?? []).map((l) => {
          const qr = l.quote_request;
          if (!qr || !ids.includes(qr.id)) return l;
          const row = byId.get(qr.id);
          return {
            ...l,
            quote_request: {
              ...qr,
              customer_email: row?.customer_email ?? null,
              customer_phone: row?.customer_phone ?? null,
            },
          } as Lead;
        })
      );
      if (error) toast.error("Kontaktoplysninger kunne ikke hentes lige nu");
    })();
    return () => { cancelled = true; };
  }, [leads]);

  // Optimistisk opdatering med automatisk tilbagerulning ved fejl.
  const applyStatus = async (ids: string[], status: string) => {
    const snapshot = qc.getQueryData<Lead[]>(leadsKey);
    setLeads((prev) => prev?.map((l) => ids.includes(l.id) ? { ...l, status } : l) ?? null);
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ status, responded_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      qc.setQueryData(leadsKey, snapshot);
      toast.error("Kunne ikke opdatere – ændringen er fortrudt", {
        action: { label: "Prøv igen", onClick: () => applyStatus(ids, status) },
      });
      return false;
    }
    return true;
  };

  const updateStatus = async (id: string, status: string) => {
    if (await applyStatus([id], status)) toast.success("Lead opdateret");
  };

  const bulkUpdate = async (status: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (await applyStatus(ids, status)) {
      setSelected(new Set());
      toast.success(`${ids.length} leads opdateret`);
    }
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
      if (sourceFilter !== "all" && (l.quote_request?.source || "serviceydere") !== sourceFilter) return false;
      if (accountFilter !== "all" && leadAccount(l)?.key !== accountFilter) return false;
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
  }, [enriched, filter, categoryFilter, sourceFilter, accountFilter, priorityFilter, search, sortBy]);

  // Paginering — adaptiv sidestørrelse.
  const pageSize = useAdaptivePageSize(25);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [filter, categoryFilter, sourceFilter, accountFilter, priorityFilter, search, sortBy]);
  const pagedVisible = useMemo(
    () => visible.slice(page * pageSize, (page + 1) * pageSize),
    [visible, page, pageSize],
  );

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
    return <PageSkeleton statsCount={3} rows={5} />;
  }

  if (leadsError && !leads) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <XCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Kunne ikke hente dine leads</p>
          <p className="max-w-md text-xs text-muted-foreground">Tjek din internetforbindelse og prøv igen. Dine leads er ikke gået tabt.</p>
          <Button variant="outline" size="sm" className="min-h-11" onClick={() => refetchLeads()} disabled={fetchingLeads}>
            {fetchingLeads ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Prøv igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        <PageHeader
          title="Leads"
          description={`${allLeads.length} leads i alt${counts.new ? ` · ${counts.new} nye` : ""}${counts.dueFollowUps ? ` · ${counts.dueFollowUps} opfølgning${counts.dueFollowUps > 1 ? "er" : ""}` : ""}`}
          action={<LeadSettingsDialog businessId={businessId} />}
        />

        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card sm:hidden"><div className="min-w-0 px-2 py-2.5 text-center"><p className="truncate text-xs text-muted-foreground">Aktive</p><p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{counts.active || 0}</p></div><div className="min-w-0 px-2 py-2.5 text-center"><p className="truncate text-xs text-muted-foreground">Konvertering</p><p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{convStats.conversionRate}%</p></div><div className="min-w-0 px-2 py-2.5 text-center"><p className="truncate text-xs text-muted-foreground">Svartid</p><p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{convStats.avgRespHours > 0 ? (convStats.avgRespHours < 1 ? `${Math.round(convStats.avgRespHours * 60)} min.` : `${convStats.avgRespHours.toFixed(1).replace(".", ",")} t.`) : "—"}</p></div></div>
        <div className="hidden gap-2.5 sm:grid sm:grid-cols-3">
          <div className="min-w-[220px] flex-1 snap-start sm:min-w-0"><StatCard label="Aktive leads" value={counts.active || 0} hint={counts.new ? `${counts.new} venter på første svar` : "Indbakken er ajour"} icon={<BrandedIllustration name="activeLeads" />} /></div>
          <div className="min-w-[220px] flex-1 snap-start sm:min-w-0"><StatCard label="Konvertering" value={`${convStats.conversionRate}%`} hint={`${convStats.contactRate}% er kontaktet`} icon={<BrandedIllustration name="revenue" />} tone="ok" /></div>
          <div className="min-w-[220px] flex-1 snap-start sm:min-w-0"><StatCard label="Gennemsnitlig svartid" value={convStats.avgRespHours > 0 ? (convStats.avgRespHours < 1 ? `${Math.round(convStats.avgRespHours * 60)} min.` : `${convStats.avgRespHours.toFixed(1).replace(".", ",")} t.`) : "—"} hint="Hurtige svar øger chancen for en aftale" icon={<BrandedIllustration name="averageResponseTime" />} /></div>
        </div>

        {allLeads.length === 0 ? (
          <section aria-labelledby="lead-inbox-title" className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-foreground"><Inbox className="h-4 w-4" /></span><h2 id="lead-inbox-title" className="text-base font-semibold text-foreground">Leadindbakke</h2></div>
                <p className="mt-1 pl-10 text-xs text-muted-foreground">Alle kundehenvendelser samlet ét sted</p>
              </div>
              <Badge variant="secondary" className="w-fit">0 nye</Badge>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <EmptyState
                icon={<Inbox />}
                title="Indbakken er klar"
                description="Nye henvendelser fra Serviceydere og tilknyttede Meta-formularer vises automatisk her."
              />
            </div>
          </section>
        ) : (
          <>
            {(() => {
              const waiting = enriched.filter((l) => l.status === "new" && Date.now() - new Date(l.created_at).getTime() > 3600000);
              const tasks = [
                waiting.length > 0 && { key: "new", text: `${waiting.length} ny${waiting.length > 1 ? "e" : ""} lead${waiting.length > 1 ? "s" : ""} har ventet over 1 time på svar`, cta: "Svar nu", tone: "border-destructive/30 bg-destructive/5" },
                (counts.dueFollowUps || 0) > 0 && { key: "followup", text: `${counts.dueFollowUps} opfølgning${counts.dueFollowUps > 1 ? "er" : ""} skal laves i dag`, cta: "Se opfølgninger", tone: "border-warning/30 bg-warning/5" },
                (counts.hot || 0) > 0 && { key: "active", text: `${counts.hot} varm${counts.hot > 1 ? "e" : ""} lead${counts.hot > 1 ? "s" : ""} med høj chance for at blive til en aftale`, cta: "Vis", tone: "border-success/30 bg-success/5", sort: "smart" },
              ].filter(Boolean) as { key: string; text: string; cta: string; tone: string; sort?: string }[];
              if (!tasks.length) return (
                <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Alt er besvaret. Nye leads dukker op her, og du får en e-mail, når de kommer.</div>
              );
              return (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center">
                  <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pr-1">Næste skridt</p>
                  <div className="grid min-w-0 flex-1 gap-2 xl:grid-cols-3">
                    {tasks.map((t) => (
                      <Button variant="ghost"
                        key={t.key + t.text}
                        type="button"
                        onClick={() => { setFilter(t.key); if (t.sort) setSortBy(t.sort); }}
                        className={`flex h-auto min-h-11 min-w-0 items-center justify-between gap-3 whitespace-normal rounded-md border px-3 py-2 text-left transition-colors hover:border-foreground/20 ${t.tone}`}
                      >
                        <span className="text-xs font-medium text-foreground">{t.text}</span>
                        <span className="text-xs font-semibold text-foreground">{t.cta}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-foreground"><Inbox className="h-4 w-4" /></span><h2 className="text-base font-semibold text-foreground">Leadindbakke</h2></div>
                <p className="mt-1 pl-10 text-xs text-muted-foreground">{visible.length} af {allLeads.length} leads vises</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-4 w-4" />Søg, sortér og filtrér</div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg kunde, e-mail, by eller note…"
                  aria-label="Søg i leads" autoComplete="off" className="h-11 min-w-0 pl-9 rounded-md"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger aria-label="Sortér leads" className="h-11 w-full rounded-md sm:w-[230px]">
                  <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm">
                    <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="[&_[role=option]]:min-h-11">
                  <SelectItem value="smart">Anbefalet rækkefølge</SelectItem>
                  <SelectItem value="newest">Nyeste først</SelectItem>
                  <SelectItem value="oldest">Ældste først</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status chips */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
              <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-y-2">
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
                  <div key={gi} className="contents sm:flex sm:shrink-0 sm:items-center sm:gap-1.5 sm:flex-wrap">
                    {gi > 0 && <span aria-hidden className="mx-1 hidden h-5 w-px bg-border/80 sm:block" />}
                    {group.map(({ key, label, count, tone }) => {
                      const isActive = filter === key;
                      const dotCls = tone === "danger" ? "before:bg-destructive" : tone === "warn" ? "before:bg-warning" : "";
                      const showDot = !!tone && count > 0;
                      return (
                        <Button variant="ghost"
                          key={key}
                          aria-pressed={isActive}
                          onClick={() => setFilter(key)}
                           className={`relative inline-flex min-h-11 min-w-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-sm sm:shrink-0 sm:justify-start font-medium transition-colors ${
                            showDot ? `before:absolute before:left-2 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full ${dotCls} pl-5` : ""
                          } ${
                            isActive
                              ? "border-foreground/30 bg-foreground text-background shadow-sm hover:bg-foreground/90"
                              : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`tabular-nums rounded-md px-1.5 text-xs font-semibold ${
                            isActive ? "bg-background/20 text-background" : "bg-secondary text-foreground/70"
                          }`}>
                            {count}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ));
              })()}

              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger aria-label="Filtrér efter kilde" className="h-11 w-full rounded-md text-sm sm:w-[170px]">
                    <SelectValue placeholder="Alle kilder" />
                  </SelectTrigger>
                  <SelectContent className="[&_[role=option]]:min-h-11">
                    <SelectItem value="all">Alle kilder</SelectItem>
                    <SelectItem value="serviceydere">Serviceydere</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
                {accounts.length > 0 && (
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger aria-label="Filtrér efter side eller konto" className="h-11 w-full rounded-md text-sm sm:w-[190px]">
                      <SelectValue placeholder="Alle sider og konti" />
                    </SelectTrigger>
                    <SelectContent className="[&_[role=option]]:min-h-11">
                      <SelectItem value="all">Alle sider og konti</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.key} value={a.key}>{a.source === "instagram" ? "Instagram" : "Facebook"} · {a.label} ({a.total})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {allCategories.length > 1 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger aria-label="Filtrér efter kategori" className="h-11 w-full rounded-md text-sm sm:w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="[&_[role=option]]:min-h-11">
                      <SelectItem value="all">Alle kategorier</SelectItem>
                      {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-foreground/20 bg-foreground/95 px-4 py-2.5 text-background shadow-lg ">
                <span className="text-sm font-medium">{selected.size} valgt</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" className="min-h-11 gap-1.5" onClick={() => bulkUpdate("contacted")}>
                    <Mail className="h-3.5 w-3.5" /> Marker kontaktet
                  </Button>
                  <Button size="sm" variant="secondary" className="min-h-11 gap-1.5" onClick={() => bulkUpdate("won")}>
                    <Trophy className="h-3.5 w-3.5" /> Vundet
                  </Button>
                  <Button size="sm" variant="secondary" className="min-h-11 gap-1.5 text-destructive" onClick={() => bulkUpdate("declined")}>
                    <XCircle className="h-3.5 w-3.5" /> Afvis
                  </Button>
                  <Button size="sm" variant="ghost" className="min-h-11 text-background hover:bg-background/10" onClick={() => setSelected(new Set())}>
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
                <div className="flex min-h-11 items-center gap-2 px-1 text-sm text-muted-foreground">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === visible.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Vælg alle"
                  />
                  <span>Vælg alle synlige ({visible.length})</span>
                </div>

                <div className="space-y-2">
                  {pagedVisible.map((l) => {
                    const qr = l.quote_request;
                    const status = STATUS_LABELS[l.status] ?? STATUS_LABELS.new;
                    const share = qr?.share_contact !== false;
                    const isDue = !!l.follow_up_at && new Date(l.follow_up_at).getTime() <= Date.now() && l.status !== "won" && l.status !== "declined";
                    const isSelected = selected.has(l.id);
                    const source = qr?.source || "serviceydere";
                    const baseSource = source === "facebook" ? "Facebook" : source === "instagram" ? "Instagram" : "Serviceydere";
                    const acct = leadAccount(l);
                    const sourceLabel = acct ? `${baseSource} · ${acct.label}` : baseSource;

                    return (
                      <Card
                        key={l.id}
                        onClick={(e) => {
                          // Don't open if clicking checkbox or interactive elements
                          const t = e.target as HTMLElement;
                          if (t.closest('button, a, input, [role="checkbox"]')) return;
                          setOpenId(l.id);
                        }}
                        className={`surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer [content-visibility:auto] [contain-intrinsic-size:1px_140px] ${
                          isSelected ? "ring-2 ring-foreground/30" : isDue ? "ring-1 ring-destructive/40" : ""
                        }`}
                      >
                        <CardContent className="p-0">
                          {/* Top accent banners */}
                          {isDue && (
                            <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                              <BellRing className="h-3 w-3" /> Opfølgning forfalden — {formatDistanceToNow(new Date(l.follow_up_at!), { addSuffix: true, locale: da })}
                            </div>
                          )}
                          <div className="flex min-w-0 gap-2.5 p-3 sm:p-4">
                            {/* Selection checkbox */}
                            <div className="pt-0.5">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(l.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Vælg lead"
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 xl:flex-row xl:items-start">
                              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <h3 className="break-words [overflow-wrap:anywhere] text-sm font-semibold text-foreground">{qr?.customer_name || "Anonym kunde"}</h3>
                                  <Badge className={`${status.className} border rounded-md pointer-events-none text-xs px-1.5 py-0.5 h-auto whitespace-normal break-words`}>{status.label}</Badge>
                                  {qr?.category && <Badge variant="secondary" className="rounded-md pointer-events-none text-xs px-1.5 py-0.5 h-auto whitespace-normal break-words">{qr.category}</Badge>}
                                  <Badge variant="outline" className="rounded-md pointer-events-none text-xs px-1.5 py-0.5 h-auto whitespace-normal break-words">{sourceLabel}</Badge>
                                  {l.follow_up_at && !isDue && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="gap-1 rounded-md cursor-help text-xs px-1.5 py-0 h-5">
                                          <Bell className="h-3 w-3" /> {formatDistanceToNow(new Date(l.follow_up_at), { addSuffix: true, locale: da })}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">Opfølgning sat: {new Date(l.follow_up_at).toLocaleString("da-DK")}</p></TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  {(qr?.zip_code || qr?.city) && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> {[qr.zip_code, qr.city].filter(Boolean).join(" ")}
                                      {typeof l.distance_km === "number" && ` • ~${Math.round(l.distance_km)} km`}
                                    </span>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1 cursor-help">
                                        <Calendar className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: da })}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="text-xs">{new Date(l.created_at).toLocaleString("da-DK")}</p></TooltipContent>
                                  </Tooltip>
                                  {l.estimated_price && (
                                    <span>Estimat: <span className="font-semibold text-foreground">{l.estimated_price}</span></span>
                                  )}
                                </div>
                                {qr?.description && (
                                  <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere] text-foreground/80">{qr.description}</p>
                                )}
                                {l.business_note && (
                                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs">
                                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="line-clamp-1 text-foreground/80">{l.business_note}</p>
                                  </div>
                                )}
                                {share && qr && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {qr.customer_email && <Button asChild variant="outline" className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal px-2 text-sm"><a
                                      href={`mailto:${qr.customer_email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="[overflow-wrap:anywhere]"
                                    >
                                      <Mail className="h-3 w-3" /> {qr.customer_email}
                                    </a></Button>}
                                    {qr.customer_phone && (
                                      <Button asChild variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal px-2 text-sm"><a
                                        href={`tel:${qr.customer_phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="[overflow-wrap:anywhere]"
                                      >
                                        <Phone className="h-3 w-3" /> {qr.customer_phone}
                                      </a></Button>
                                    )}
                                  </div>
                                )}
                                {!share && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Kunden har ikke delt direkte kontaktinfo — svar via platformen.
                                  </p>
                                )}
                              </div>

                              {/* Action column */}
                              <div className="flex w-full shrink-0 flex-col gap-1.5 xl:w-44" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  onClick={() => setOpenId(l.id)}
                                  className="min-h-11 gap-1.5 text-sm"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> Åbn & svar
                                </Button>
                                <div className="flex gap-1">
                                  {l.status !== "won" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateStatus(l.id, "won")}
                                      className="min-h-11 flex-1 gap-1 text-sm"
                                    >
                                      <Trophy className="h-3 w-3" /> Vundet
                                    </Button>
                                  )}
                                  {l.status !== "declined" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => updateStatus(l.id, "declined")}
                                      className="min-h-11 flex-1 gap-1 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <XCircle className="h-3 w-3" /> Afvis
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <PaginationFooter
                  page={page}
                  pageSize={pageSize}
                  total={visible.length}
                  onPageChange={setPage}
                  label="leads"
                />
              </>
            )}
          </>
        )}

        <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
          <LeadSourceDashboard leads={allLeads} accounts={accounts} activeAccount={accountFilter}
            onPickAccount={(k) => { setAccountFilter((cur) => cur === k ? "all" : k); setFilter("all"); }} />
          <MetaLeadsSetup businessId={businessId} />
        </div>

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
