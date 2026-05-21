import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Plus, Building2, UploadCloud, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { exportCsv } from "./lib/csv";
import { useAdminMutation } from "./lib/useAdminMutation";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  PAGE_SIZE, loadViews, saveViews,
  type FilterKey, type SortKey, type SavedView, type BusinessRow,
} from "./businesses/types";
import { SortMenu, ViewsMenu, BusinessChips } from "./businesses/BusinessesFilters";
import { BulkActionsBar } from "./businesses/BulkActionsBar";
import { BusinessListRow } from "./businesses/BusinessRow";
import { ImpersonationDialog } from "./businesses/ImpersonationDialog";
import { useImpersonation } from "./businesses/useImpersonation";
import { SearchInput } from "@/components/admin/shared/AdminUI";

const DataImportTab = lazy(() => import("@/components/admin/DataImportTab"));
const BusinessDetailSheet = lazy(() => import("./BusinessDetailSheet"));
const CreateBusinessWizard = lazy(() => import("./CreateBusinessWizard"));

type ListData = { total: number; rows: BusinessRow[]; counts: Record<string, number> };

/**
 * Orchestrator for virksomheder-fanen — kun state, server-paged query, mutations og layout.
 * Toolbar/filter/række/dialog er udskilt til `./businesses/*`.
 */
const PlatformBusinessesTab = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [views, setViews] = useState<SavedView[]>(() => loadViews());
  const [importFor, setImportFor] = useState<{ id: string; name: string } | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const impersonation = useImpersonation();

  useEffect(() => { setPage(0); }, [q, filter, sort]);

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
      return data as unknown as ListData;
    },
    placeholderData: (prev) => prev,
  });

  const rows = listData?.rows ?? [];
  const total = listData?.total ?? 0;
  const counts = listData?.counts ?? {};
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateBiz = useAdminMutation<void, { ids: string[]; patch: Partial<Pick<BusinessRow, "is_verified" | "is_active">> }>({
    mutationFn: async ({ ids, patch }) => {
      const { error } = await supabase.from("businesses").update(patch).in("id", ids);
      if (error) throw error;
    },
    successMessage: (_d, v) => `Opdateret (${v.ids.length})`,
    invalidateKeys: [["admin-businesses-rpc"]],
    onDone: () => setSelected(new Set()),
  });

  const deleteBiz = useAdminMutation<void, string[]>({
    mutationFn: async (ids) => {
      const { error } = await supabase.from("businesses").delete().in("id", ids);
      if (error) throw error;
    },
    successMessage: (_d, ids) => `${ids.length} virksomheder slettet`,
    invalidateKeys: [["admin-businesses-rpc"]],
    onDone: () => setSelected(new Set()),
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
    const all: BusinessRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.rpc("admin_list_businesses", {
        p_search: q.trim() || null, p_filter: filter, p_sort: sort,
        p_limit: 200, p_offset: offset,
      });
      if (error) { toast.error(error.message); return; }
      const d = data as unknown as ListData;
      all.push(...d.rows);
      if (all.length >= d.total || d.rows.length === 0) break;
      offset += 200;
      if (offset > 5000) break;
    }
    exportCsv("virksomheder", all.map((b) => ({
      navn: b.name, slug: b.slug, kategori: b.category || "",
      by: b.city || "", email: b.email || "",
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
  const deleteView = (id: string) => { const next = views.filter((v) => v.id !== id); setViews(next); saveViews(next); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Virksomheder"
        description={`${total} ${total === 1 ? "virksomhed" : "virksomheder"} matcher · side ${page + 1}/${totalPages}`}
        action={
          <div className="flex items-center gap-2">
            <SortMenu sort={sort} onSortChange={setSort} />
            <ViewsMenu views={views} onSaveView={saveCurrentView} onApplyView={applyView} onDeleteView={deleteView} />
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
        <BusinessChips filter={filter} onFilterChange={setFilter} counts={counts} />
      </div>

      {someSelected && (
        <BulkActionsBar
          count={selected.size}
          onUpdate={(patch) => updateBiz.mutate({ ids: Array.from(selected), patch })}
          onDelete={() => {
            if (confirm(`Slet ${selected.size} virksomheder?`)) deleteBiz.mutate(Array.from(selected));
          }}
          onClear={() => setSelected(new Set())}
        />
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
            {rows.map((b) => (
              <BusinessListRow
                key={b.id}
                b={b}
                selected={selected.has(b.id)}
                onToggle={toggleOne}
                onVerifyToggle={(row) => updateBiz.mutate({ ids: [row.id], patch: { is_verified: !row.is_verified } })}
                onAdminister={setDetailFor}
                onImport={setImportFor}
                onImpersonate={impersonation.open}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/20 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Viser {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} af {total}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Forrige
                </Button>
                <span className="px-2 tabular-nums">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Næste <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Suspense fallback={null}>
        <BusinessDetailSheet businessId={detailFor} onClose={() => setDetailFor(null)} />
        <CreateBusinessWizard open={createOpen} onOpenChange={setCreateOpen} />
      </Suspense>

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

      <ImpersonationDialog
        state={impersonation.state}
        onClose={impersonation.close}
        onChangeCode={impersonation.setCode}
        onRedeem={impersonation.redeem}
      />
    </div>
  );
};

export default PlatformBusinessesTab;