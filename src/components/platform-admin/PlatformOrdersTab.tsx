import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses(name, slug), order_items(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: any }) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data || []).filter((o: any) => {
    if (status !== "all" && o.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(s) ||
      o.customer_email?.toLowerCase().includes(s) ||
      o.businesses?.name?.toLowerCase().includes(s)
    );
  });

  const totals = filtered.reduce(
    (acc, o: any) => {
      acc.gmv += Number(o.total_amount || 0);
      acc.count += 1;
      return acc;
    },
    { gmv: 0, count: 0 }
  );

  const open = data?.find((o: any) => o.id === openId) as any;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg kunde, email, virksomhed..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {totals.count} ordrer · <span className="font-semibold text-foreground">{fmtKr(totals.gmv)}</span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser ordrer...</p>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen ordrer fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((o: any) => (
              <button key={o.id} onClick={() => setOpenId(o.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
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
                  <Select value={open.status} onValueChange={(v) => updateStatus.mutate({ id: open.id, newStatus: v })}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
