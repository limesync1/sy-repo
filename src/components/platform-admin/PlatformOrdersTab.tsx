import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Mail, Phone, Calendar, Download, Trash2, ChevronDown, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";

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

const PlatformOrdersTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { inRange, rangeLabel } = useAdminFilters();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses(name, slug), order_items(*)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: any }) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Status opdateret (${v.ids.length})`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delOrders = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`${ids.length} ordrer slettet`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (data || []).filter((o: any) => {
      if (!inRange(o.created_at)) return false;
      if (status !== "all" && o.status !== status) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(s) ||
        o.customer_email?.toLowerCase().includes(s) ||
        o.businesses?.name?.toLowerCase().includes(s)
      );
    });
  }, [data, q, status, inRange]);

  const totals = filtered.reduce(
    (acc, o: any) => { acc.gmv += Number(o.total_amount || 0); acc.count += 1; return acc; },
    { gmv: 0, count: 0 }
  );

  const open = data?.find((o: any) => o.id === openId) as any;
  const allSelected = filtered.length > 0 && filtered.every((o: any) => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((o: any) => o.id)));
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const handleExport = () => {
    exportCsv(`ordrer-${rangeLabel.replace(/\s/g, "-")}`, filtered.map((o: any) => ({
      id: o.id,
      dato: new Date(o.created_at).toLocaleDateString("da-DK"),
      kunde: o.customer_name,
      email: o.customer_email,
      telefon: o.customer_phone || "",
      virksomhed: o.businesses?.name || "",
      status: o.status,
      total: o.total_amount,
    })));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ordrer"
        description={<>{totals.count} ordrer · <span className="font-medium text-foreground">{fmtKr(totals.gmv)}</span> i {rangeLabel.toLowerCase()}</>}
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg kunde, email, virksomhed..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart />}
          title="Ingen ordrer i denne periode"
          description="Skift periode i toppen, eller justér filtre."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>Vælg alle ({filtered.length})</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <Checkbox checked={selected.has(o.id)} onCheckedChange={(c) => toggleOne(o.id, !!c)} />
                <button onClick={() => setOpenId(o.id)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {o.customer_name} <span className="text-muted-foreground">·</span>{" "}
                      <span className="text-muted-foreground">{o.businesses?.name || "—"}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer_email} · {new Date(o.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className={`${statusColors[o.status] || ""} text-xs font-medium border px-2 py-0.5`}>
                    {STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status}
                  </Badge>
                  <span className="text-sm font-bold text-foreground tabular-nums w-24 text-right">{fmtKr(o.total_amount)}</span>
                </button>
                <a href={`mailto:${o.customer_email}`} onClick={(e) => e.stopPropagation()}
                   className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email kunde">
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>Ordre #{String(open.id).slice(0, 8)}</span>
                  <Badge className={`${statusColors[open.status] || ""} border`}>
                    {STATUS_OPTIONS.find((s) => s.value === open.status)?.label || open.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <p className="font-semibold text-foreground">{open.customer_name}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" />{open.customer_email}</p>
                  {open.customer_phone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{open.customer_phone}</p>}
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(open.created_at).toLocaleString("da-DK")}</p>
                  <p className="text-muted-foreground">Virksomhed: <span className="text-foreground">{open.businesses?.name || "—"}</span></p>
                </div>

                {open.order_items?.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Linjer</p>
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {open.order_items.map((it: any) => (
                        <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                          <span className="text-foreground">{it.service_name} <span className="text-muted-foreground">× {it.quantity}</span></span>
                          <span className="tabular-nums font-medium">{fmtKr(it.total_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {open.notes && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1 text-foreground">Noter</p>{open.notes}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-bold tabular-nums">{fmtKr(open.total_amount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Skift status:</span>
                  <Select value={open.status} onValueChange={(v) => updateStatus.mutate({ ids: [open.id], newStatus: v })}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <a href={`mailto:${open.customer_email}`} className="ml-auto">
                    <Button size="sm" variant="outline" className="h-9 gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformOrdersTab;
