import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Download, Trash2, ChevronDown, ShoppingCart, FileText, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import OrderDetailSheet from "./OrderDetailSheet";

const STATUS_OPTIONS = [
  { value: "pending", label: "Afventer" },
  { value: "confirmed", label: "Bekræftet" },
  { value: "in_progress", label: "I gang" },
  { value: "completed", label: "Afsluttet" },
  { value: "cancelled", label: "Annulleret" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;

const PAGE_SIZE = 50;
const SORT_OPTIONS = [
  { v: "newest", label: "Nyeste først" },
  { v: "oldest", label: "Ældste først" },
  { v: "amount_desc", label: "Højeste beløb" },
  { v: "amount_asc", label: "Laveste beløb" },
  { v: "due_asc", label: "Forfald snart" },
  { v: "customer", label: "Kunde (A–Å)" },
];

type SavedView = { name: string; q: string; status: string; quickFilter: string; sort: string };
const VIEWS_KEY = "admin_orders_saved_views";

const PlatformOrdersTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { from, to, rangeLabel } = useAdminFilters();
  const [views, setViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => { setPage(0); }, [q, status, quickFilter, sort, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders-rpc", q, status, quickFilter, sort, page, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_orders", {
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
        p_search: q || null,
        p_status: status,
        p_filter: quickFilter,
        p_sort: sort,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      return data as any;
    },
  });

  const rows: any[] = data?.rows || [];
  const total: number = data?.total || 0;
  const gmv: number = Number(data?.gmv || 0);
  const counts = data?.counts || {};

  const updateStatus = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: any }) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, newStatus }) => {
      const key = ["admin-orders-rpc", q, status, quickFilter, sort, page, from.toISOString(), to.toISOString()];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any>(key);
      if (prev?.rows) {
        qc.setQueryData(key, {
          ...prev,
          rows: prev.rows.map((r: any) => ids.includes(r.id) ? { ...r, status: newStatus } : r),
        });
      }
      return { prev, key };
    },
    onError: (e: any, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-orders-rpc"] });
      toast.success(`Status opdateret (${v.ids.length})`);
      setSelected(new Set());
    },
  });

  const delOrders = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-orders-rpc"] });
      toast.success(`${ids.length} ordrer slettet`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const allSelected = rows.length > 0 && rows.every((o) => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((o) => o.id)));
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const handleExport = async () => {
    toast.loading("Eksporterer...", { id: "ord-export" });
    const all: any[] = [];
    for (let p = 0; p < 100; p++) {
      const { data, error } = await supabase.rpc("admin_list_orders", {
        p_limit: 500, p_offset: p * 500,
        p_search: q || null, p_status: status, p_filter: quickFilter, p_sort: sort,
        p_from: from.toISOString(), p_to: to.toISOString(),
      });
      if (error) { toast.error(error.message, { id: "ord-export" }); return; }
      const r = (data as any)?.rows || [];
      all.push(...r);
      if (r.length < 500) break;
    }
    exportCsv(`ordrer-${rangeLabel.replace(/\s/g, "-")}`, all.map((o) => ({
      id: o.id,
      dato: new Date(o.created_at).toLocaleDateString("da-DK"),
      kunde: o.customer_name,
      email: o.customer_email,
      telefon: o.customer_phone || "",
      virksomhed: o.business_name || "",
      status: o.status,
      betaling: o.payment_status || "",
      forfald: o.due_date || "",
      faktura: o.invoice_external_number || "",
      total: o.total_amount,
    })));
    toast.success(`Eksporteret ${all.length} ordrer`, { id: "ord-export" });
  };

  const saveView = () => {
    const name = prompt("Navn på visning:");
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, q, status, quickFilter, sort }];
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    toast.success(`Visning "${name}" gemt`);
  };
  const applyView = (v: SavedView) => {
    setQ(v.q); setStatus(v.status); setQuickFilter(v.quickFilter); setSort(v.sort);
  };
  const deleteView = (name: string) => {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chips = [
    { v: "all", label: "Alle" },
    { v: "today", label: `I dag${counts.today ? ` (${counts.today})` : ""}` },
    { v: "week", label: `Denne uge${counts.week ? ` (${counts.week})` : ""}` },
    { v: "overdue", label: `Forfaldne${counts.overdue ? ` (${counts.overdue})` : ""}` },
    { v: "unpaid", label: `Ubetalte${counts.unpaid ? ` (${counts.unpaid})` : ""}` },
    { v: "unpaid7", label: `Ubetalte >7d${counts.unpaid7 ? ` (${counts.unpaid7})` : ""}` },
    { v: "credited", label: `Kreditnota${counts.credited ? ` (${counts.credited})` : ""}` },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ordrer"
        description={<>{total} ordrer · <span className="font-medium text-foreground">{fmtKr(gmv)}</span> i {rangeLabel.toLowerCase()}</>}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={saveView} className="h-9 gap-1.5">
              <Save className="h-3.5 w-3.5" /> Gem visning
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg kunde, email, virksomhed..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (<SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Gemte:</span>
          {views.map((v) => (
            <span key={v.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 pl-2.5 pr-1 py-0.5 text-xs">
              <button onClick={() => applyView(v)} className="font-medium text-foreground hover:text-accent">{v.name}</button>
              <button onClick={() => deleteView(v.name)} className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Slet visning">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button key={c.v} onClick={() => setQuickFilter(c.v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              quickFilter === c.v
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
          <span className="font-medium text-foreground">{selected.size} valgt</span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5">
                  Skift status <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => updateStatus.mutate({ ids: Array.from(selected), newStatus: s.value })}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700"
              onClick={() => { if (confirm(`Slet ${selected.size} ordrer?`)) delOrders.mutate(Array.from(selected)); }}>
              <Trash2 className="h-3.5 w-3.5" /> Slet
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected(new Set())}>Ryd</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart />}
          title="Ingen ordrer i denne periode"
          description="Skift periode i toppen, eller justér filtre."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>Vælg på siden ({rows.length} af {total})</span>
          </div>
          <div className="divide-y divide-border">
            {rows.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Checkbox checked={selected.has(o.id)} onCheckedChange={(c) => toggleOne(o.id, !!c)} />
                <button onClick={() => setOpenId(o.id)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {o.customer_name} <span className="text-muted-foreground">·</span>{" "}
                      <span className="text-muted-foreground">{o.business_name || "—"}</span>
                      {o.invoice_external_number && (
                        <span className="ml-2 text-xs text-muted-foreground">#{o.invoice_external_number}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer_email} · {new Date(o.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                      {o.due_date && <> · Forfald {new Date(o.due_date).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</>}
                    </p>
                  </div>
                  <Badge className={`${statusColors[o.status] || ""} text-xs font-medium border px-2 py-0.5`}>
                    {STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status}
                  </Badge>
                  <span className="text-sm font-bold text-foreground tabular-nums w-24 text-right">{fmtKr(o.total_amount)}</span>
                </button>
                {o.invoice_external_id && (
                  <span className="rounded-md p-1.5 text-muted-foreground" title={`Faktura ${o.invoice_external_number || ""}`}>
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                )}
                <a href={`mailto:${o.customer_email}`} onClick={(e) => e.stopPropagation()}
                   className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email kunde">
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-4 py-2 text-xs text-muted-foreground">
              <span>Side {page + 1} af {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Forrige
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Næste <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <OrderDetailSheet orderId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};

export default PlatformOrdersTab;
