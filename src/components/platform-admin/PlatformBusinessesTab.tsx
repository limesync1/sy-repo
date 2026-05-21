import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, ExternalLink, Trash2, MapPin, Mail, BadgeCheck, Download, ChevronDown, CreditCard, Clock, AlertTriangle, Building2, UploadCloud, LogIn, KeyRound, Loader2, MailCheck, Settings2, Plus, Star, ChevronLeft, ChevronRight, ArrowUpDown, LogIn as LoginIcon, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { setImpersonatedBusinessId } from "@/lib/admin-impersonation";

const DataImportTab = lazy(() => import("@/components/admin/DataImportTab"));
const BusinessDetailSheet = lazy(() => import("./BusinessDetailSheet"));
const CreateBusinessWizard = lazy(() => import("./CreateBusinessWizard"));

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const PAGE_SIZE = 50;

type FilterKey =
  | "all" | "active_paying" | "trial" | "trial_expiring"
  | "expired_no_card" | "inactive" | "unverified" | "no_orders" | "no_login";
type SortKey =
  | "created_desc" | "created_asc" | "revenue_desc" | "orders_desc"
  | "last_order_desc" | "last_login_desc" | "name_asc";

type SavedView = { id: string; name: string; q: string; filter: FilterKey; sort: SortKey };
const SAVED_VIEWS_KEY = "admin.businesses.savedViews.v1";
const loadViews = (): SavedView[] => {
  try { return JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || "[]"); } catch { return []; }
};
const saveViews = (v: SavedView[]) => localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(v));

const fmtRelDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return "i dag";
  if (diff < 2 * day) return "i går";
  if (diff < 30 * day) return `${Math.floor(diff / day)}d siden`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}m siden`;
  return `${Math.floor(diff / (365 * day))}å siden`;
};

const PlatformBusinessesTab = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [views, setViews] = useState<SavedView[]>(() => loadViews());

  useEffect(() => { setPage(0); }, [q, filter, sort]);

  // Sheet til at køre dataimport for en specifik virksomhed
  const [importFor, setImportFor] = useState<{ id: string; name: string } | null>(null);

  // Sheet til komplet virksomheds-kontrolpanel (trial, plan, slet osv.)
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Dialog til 5-cifret impersonation-kode
  const [impersonate, setImpersonate] = useState<{
    business: { id: string; name: string };
    sentTo: string | null;
    inputCode: string;
    loading: boolean;
    redeeming: boolean;
  } | null>(null);

  const openImpersonate = async (b: { id: string; name: string }) => {
    setImpersonate({ business: b, sentTo: null, inputCode: "", loading: true, redeeming: false });
    const { data: code, error } = await supabase.rpc("admin_create_impersonation_code", { p_business_id: b.id });
    if (error || !code) {
      toast.error("Kunne ikke generere kode: " + (error?.message ?? "ukendt fejl"));
      setImpersonate(null);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const adminEmail = userData?.user?.email;
    if (!adminEmail) {
      toast.error("Kunne ikke finde din admin-email");
      setImpersonate(null);
      return;
    }
    const adminName =
      (userData?.user?.user_metadata as any)?.full_name ||
      (userData?.user?.user_metadata as any)?.name ||
      adminEmail.split("@")[0];
    const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-impersonation-code",
        recipientEmail: adminEmail,
        idempotencyKey: `admin-impersonation-${b.id}-${code}`,
        templateData: {
          businessName: b.name,
          code: code as string,
          expiresInMinutes: 15,
          adminName,
        },
      },
    });
    if (mailErr) {
      toast.error("Kunne ikke sende kode på e-mail: " + mailErr.message);
      setImpersonate(null);
      return;
    }
    toast.success(`Kode sendt til ${adminEmail}`);
    setImpersonate({ business: b, sentTo: adminEmail, inputCode: "", loading: false, redeeming: false });
  };

  const redeemImpersonate = async () => {
    if (!impersonate) return;
    const code = impersonate.inputCode.trim();
    if (code.length !== 5) {
      toast.error("Koden skal være 5 cifre");
      return;
    }
    setImpersonate({ ...impersonate, redeeming: true });
    const { data, error } = await supabase.rpc("admin_redeem_impersonation_code", { p_code: code });
    if (error || !data) {
      toast.error("Ugyldig eller udløbet kode");
      setImpersonate({ ...impersonate, redeeming: false });
      return;
    }
    setImpersonatedBusinessId(data as string);
    toast.success(`Logget ind som ${impersonate.business.name}`);
    setImpersonate(null);
    navigate("/virksomhed");
  };

  // Server-side paged RPC — skalerer over 1.000 rækker.
  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ["admin-businesses-rpc", q, filter, sort, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_businesses", {
        p_search: q.trim() || null,
        p_filter: filter,
        p_sort: sort,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as unknown as { total: number; rows: any[]; counts: Record<string, number> };
    },
    placeholderData: (prev) => prev,
  });

  const rows: any[] = listData?.rows ?? [];
  const total = listData?.total ?? 0;
  const counts = (listData?.counts ?? {}) as Record<string, number>;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateBiz = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: any }) => {
      const { error } = await supabase.from("businesses").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-businesses-rpc"] });
      toast.success(`Opdateret (${v.ids.length})`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBiz = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("businesses").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-businesses-rpc"] });
      toast.success(`${ids.length} virksomheder slettet`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const allSelected = rows.length > 0 && rows.every((b) => selected.has(b.id));
  const someSelected = selected.size > 0;
  const toggleAll = () => allSelected ? setSelected(new Set()) : setSelected(new Set(rows.map((b) => b.id)));
  const toggleOne = (id: string, c: boolean) => {
    const n = new Set(selected);
    if (c) n.add(id); else n.delete(id);
    setSelected(n);
  };

  const handleExport = async () => {
    toast.message("Eksporterer alle matchende rækker…");
    const all: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.rpc("admin_list_businesses", {
        p_search: q.trim() || null, p_filter: filter, p_sort: sort,
        p_limit: 200, p_offset: offset,
      });
      if (error) { toast.error(error.message); return; }
      const d = data as unknown as { total: number; rows: any[] };
      all.push(...d.rows);
      if (all.length >= d.total || d.rows.length === 0) break;
      offset += 200;
      if (offset > 5000) break;
    }
    exportCsv("virksomheder", all.map((b: any) => ({
      navn: b.name, slug: b.slug, kategori: b.category || "",
      by: b.city || "", email: b.email || "", telefon: b.phone || "",
      verificeret: b.is_verified ? "ja" : "nej", aktiv: b.is_active ? "ja" : "nej",
      oprettet: new Date(b.created_at).toLocaleDateString("da-DK"),
      ordrer: b.orders_count || 0, omsaetning: b.total_revenue || 0,
      plan_status: b.plan_status || "—",
      proeve_dage_tilbage: b.days_left ?? "—",
      maanedspris: b.monthly_price_dkk || 0,
      kort: b.stripe_payment_method_last4 ? `${b.stripe_payment_method_brand} •••• ${b.stripe_payment_method_last4}` : "ingen",
      sidste_login: b.owner_last_login ? new Date(b.owner_last_login).toLocaleDateString("da-DK") : "aldrig",
      sidste_ordre: b.last_order_at ? new Date(b.last_order_at).toLocaleDateString("da-DK") : "ingen",
    })));
  };

  const saveCurrentView = () => {
    const name = prompt("Navngiv visning (fx 'Forfaldne prøver')");
    if (!name) return;
    const v: SavedView = { id: crypto.randomUUID(), name, q, filter, sort };
    const next = [...views, v];
    setViews(next); saveViews(next);
    toast.success(`Visning '${name}' gemt`);
  };
  const applyView = (v: SavedView) => { setQ(v.q); setFilter(v.filter); setSort(v.sort); };
  const deleteView = (id: string) => { const next = views.filter(v => v.id !== id); setViews(next); saveViews(next); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Virksomheder"
        description={`${total} ${total === 1 ? "virksomhed" : "virksomheder"} matcher · side ${page + 1}/${totalPages}`}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Sortér
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {([
                  ["created_desc","Nyeste først"],
                  ["created_asc","Ældste først"],
                  ["revenue_desc","Højeste omsætning"],
                  ["orders_desc","Flest ordrer"],
                  ["last_order_desc","Senest aktive (ordre)"],
                  ["last_login_desc","Senest logget ind"],
                  ["name_asc","Navn A→Z"],
                ] as const).map(([k,l]) => (
                  <DropdownMenuItem key={k} onClick={() => setSort(k as SortKey)}>
                    {sort === k ? "✓ " : ""}{l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Visninger
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem onClick={saveCurrentView}>+ Gem nuværende visning</DropdownMenuItem>
                {views.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Ingen gemte visninger</div>
                )}
                {views.map(v => (
                  <DropdownMenuItem key={v.id} onClick={() => applyView(v)} className="justify-between gap-2">
                    <span className="truncate">{v.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteView(v.id); }} className="text-muted-foreground hover:text-destructive text-xs">×</button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-9 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Opret virksomhed
            </Button>
          </div>
        }
      />

      <div className="space-y-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, by, kategori, e-mail..." />
        {/* Chip-filtre med tællere — gør status synlig uden ekstra klik */}
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { v: "all", label: "Alle", count: counts.all_n ?? 0, tone: "default" },
            { v: "active_paying", label: "Aktive (betalende)", count: counts.active_paying ?? 0, tone: "success" },
            { v: "trial", label: "På prøve", count: counts.trial ?? 0, tone: "default" },
            { v: "trial_expiring", label: "Prøve udløber ≤3d", count: counts.trial_expiring ?? 0, tone: "warning" },
            { v: "expired_no_card", label: "Prøve udløbet · intet kort", count: counts.expired_no_card ?? 0, tone: "danger" },
            { v: "inactive", label: "Inaktive", count: counts.inactive ?? 0, tone: "default" },
            { v: "unverified", label: "Ikke verificeret", count: counts.unverified ?? 0, tone: "default" },
            { v: "no_orders", label: "Ingen ordrer", count: counts.no_orders ?? 0, tone: "default" },
            { v: "no_login", label: "Aldrig logget ind", count: counts.no_login ?? 0, tone: "warning" },
          ] as const).map((c) => {
            const active = filter === c.v;
            const toneCls =
              active
                ? c.tone === "success" ? "bg-emerald-600 text-white border-emerald-600"
                : c.tone === "warning" ? "bg-amber-600 text-white border-amber-600"
                : c.tone === "danger"  ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground";
            return (
              <button
                key={c.v}
                onClick={() => setFilter(c.v as any)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${toneCls}`}
              >
                {c.label}
                <span className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-background/20" : "bg-secondary text-muted-foreground"}`}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} valgt</span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">Handlinger <ChevronDown className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_verified: true } })}>Verificér</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_verified: false } })}>Fjern verifikation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_active: true } })}>Aktivér</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_active: false } })}>Deaktivér</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => { if (confirm(`Slet ${selected.size} virksomheder?`)) deleteBiz.mutate(Array.from(selected)); }}>
              <Trash2 className="h-3.5 w-3.5" /> Slet
            </Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => setSelected(new Set())}>Ryd</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ListCardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Ingen virksomheder fundet"
          description="Justér søgning eller filter for at se flere resultater."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>Vælg alle på siden ({rows.length})</span>
            {isFetching && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
          </div>
          <div className="divide-y divide-border">
            {rows.map((b: any) => {
              const hasCard = !!b.stripe_payment_method_last4;
              const daysLeft: number | null = b.days_left ?? null;
              const isExpired = !hasCard && daysLeft !== null && daysLeft <= 0;
              const isWarning = !hasCard && daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                  <Checkbox checked={selected.has(b.id)} onCheckedChange={(c) => toggleOne(b.id, !!c)} />
                  <div className="relative shrink-0">
                    {b.logo_url ? (
                      <img
                        src={b.logo_url}
                        alt=""
                        className="h-10 w-10 rounded object-contain bg-secondary p-0.5"
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                        {b.name.charAt(0)}
                      </div>
                    )}
                    {b.is_verified && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-background shadow-sm">
                        <BadgeCheck className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                      {!b.is_active && (
                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive ring-1 ring-inset ring-destructive/20">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {b.category && <span>{b.category}</span>}
                      {b.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.city}</span>}
                      {(b.owner_email || b.email) && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{b.owner_email || b.email}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Oprettet {new Date(b.created_at).toLocaleDateString("da-DK")} ·{` ${Number(b.orders_count || 0)} ordrer · ${fmtKr(Number(b.total_revenue || 0))}`}
                      {Number(b.pending_count || 0) > 0 && <span className="text-amber-700"> · {Number(b.pending_count)} afventer</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1" title="Sidste login (ejer)">
                        <LoginIcon className="h-3 w-3" /> {b.owner_last_login ? fmtRelDate(b.owner_last_login) : "aldrig"}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Sidste ordre">
                        <Activity className="h-3 w-3" /> {b.last_order_at ? fmtRelDate(b.last_order_at) : "ingen"}
                      </span>
                    </p>
                    {(b.plan_status || hasCard || daysLeft !== null) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {hasCard ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CreditCard className="h-3 w-3" />
                            {b.stripe_payment_method_brand || "Kort"} •••• {b.stripe_payment_method_last4}
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                            <AlertTriangle className="h-3 w-3" /> Prøve udløbet · intet kort
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            <Clock className="h-3 w-3" /> {daysLeft} dage prøve tilbage · intet kort
                          </span>
                        ) : daysLeft !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 font-medium text-muted-foreground ring-1 ring-inset ring-border">
                            <Clock className="h-3 w-3" /> {daysLeft} dage prøve tilbage
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 font-medium text-muted-foreground ring-1 ring-inset ring-border">
                          {fmtKr(Number(b.monthly_price_dkk) || 0)}/md
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => updateBiz.mutate({ ids: [b.id], patch: { is_verified: !b.is_verified } })}>
                      {b.is_verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{b.is_verified ? "Fjern verif." : "Verificér"}</span>
                    </Button>
                    <Button size="sm" variant="default" className="gap-1.5"
                      onClick={() => setDetailFor(b.id)}
                      title="Åbn fuldt kontrolpanel: prøveperiode, plan, ejer, slet">
                      <Settings2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Administrér</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setImportFor({ id: b.id, name: b.name })}
                      title="Importér data for denne virksomhed"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Importér data</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openImpersonate({ id: b.id, name: b.name })}
                      title="Log ind på denne virksomheds panel"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Log ind som</span>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label="Åbn virksomhedens side">
                      <Link to={`/b/${b.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/20 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Viser {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} af {total}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Forrige
                </Button>
                <span className="px-2 tabular-nums">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Næste <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Detalje-sheet: alle admin-handlinger for én virksomhed samlet */}
      <Suspense fallback={null}>
        <BusinessDetailSheet businessId={detailFor} onClose={() => setDetailFor(null)} />
        <CreateBusinessWizard open={createOpen} onOpenChange={setCreateOpen} />
      </Suspense>

      {/* Dataimport sheet — kører DataImportTab i kontekst af den valgte virksomhed */}
      <Sheet open={!!importFor} onOpenChange={(open) => { if (!open) setImportFor(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" /> Dataimport · {importFor?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {importFor && (
              <Suspense fallback={<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Indlæser dataimport…</div>}>
                <DataImportTab businessId={importFor.id} businessName={importFor.name} />
              </Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Impersonation dialog — viser 5-cifret kode + felt til at indløse */}
      <Dialog open={!!impersonate} onOpenChange={(open) => { if (!open) setImpersonate(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Log ind som {impersonate?.business.name}
            </DialogTitle>
            <DialogDescription>
              Vi sender en 5-cifret engangskode til din admin-e-mail. Indtast koden for at åbne virksomhedens panel. Koden er gyldig i 15 minutter og kan kun bruges én gang. Virksomheden får ikke besked.
            </DialogDescription>
          </DialogHeader>

          {impersonate?.loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer og sender kode…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start gap-3">
                  <MailCheck className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Kode sendt på e-mail</p>
                    <p className="text-muted-foreground">
                      Vi har sendt en 5-cifret engangskode til <span className="font-medium text-foreground">{impersonate?.sentTo}</span>. Koden er gyldig i 15 minutter.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Indtast kode for at fortsætte</label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="•••••"
                  className="mt-1 text-center font-mono text-2xl tracking-[0.4em] tabular-nums h-12"
                  value={impersonate?.inputCode ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setImpersonate((p) => (p ? { ...p, inputCode: v } : p));
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") redeemImpersonate(); }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImpersonate(null)}>Annullér</Button>
            <Button
              onClick={redeemImpersonate}
              disabled={!impersonate || impersonate.loading || impersonate.redeeming || (impersonate.inputCode ?? "").length !== 5}
            >
              {impersonate?.redeeming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logger ind…</> : "Åbn virksomhedens panel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformBusinessesTab;
