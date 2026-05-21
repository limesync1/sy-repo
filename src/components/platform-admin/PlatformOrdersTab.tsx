import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, ShoppingCart, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import OrderDetailSheet from "./OrderDetailSheet";
import { PAGE_SIZE, VIEWS_KEY, SavedView, fmtKr, buildChips } from "./orders/shared";
import OrderRow from "./orders/OrderRow";
import OrdersFilters from "./orders/OrdersFilters";
import OrdersBulkBar from "./orders/OrdersBulkBar";

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

  const queryKey = ["admin-orders-rpc", q, status, quickFilter, sort, page, from.toISOString(), to.toISOString()];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_orders", {
        p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE,
        p_search: q || null, p_status: status, p_filter: quickFilter, p_sort: sort,
        p_from: from.toISOString(), p_to: to.toISOString(),
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
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<any>(queryKey);
      if (prev?.rows) {
        qc.setQueryData(queryKey, {
          ...prev,
          rows: prev.rows.map((r: any) => ids.includes(r.id) ? { ...r, status: newStatus } : r),
        });
      }
      return { prev };
    },
    onError: (e: any, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
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
      kunde: o.customer_name, email: o.customer_email, telefon: o.customer_phone || "",
      virksomhed: o.business_name || "", status: o.status, betaling: o.payment_status || "",
      forfald: o.due_date || "", faktura: o.invoice_external_number || "", total: o.total_amount,
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
  const chips = buildChips(counts);

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

      <OrdersFilters
        q={q} setQ={setQ} status={status} setStatus={setStatus} sort={sort} setSort={setSort}
        quickFilter={quickFilter} setQuickFilter={setQuickFilter} chips={chips}
        views={views} applyView={applyView} deleteView={deleteView}
      />

      {someSelected && (
        <OrdersBulkBar
          count={selected.size}
          onChangeStatus={(v) => updateStatus.mutate({ ids: Array.from(selected), newStatus: v })}
          onDelete={() => { if (confirm(`Slet ${selected.size} ordrer?`)) delOrders.mutate(Array.from(selected)); }}
          onClear={() => setSelected(new Set())}
        />
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
              <OrderRow key={o.id} order={o} selected={selected.has(o.id)} onToggle={toggleOne} onOpen={setOpenId} />
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