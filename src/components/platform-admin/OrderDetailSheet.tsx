// OrderDetailSheet — side-panel for én ordre med tidslinje, betalingsstatus,
// kunde-/virksomheds-genveje og hurtige admin-handlinger.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail, Phone, MapPin, Calendar, Building2, ExternalLink,
  Receipt, CreditCard, CheckCircle2, Clock, XCircle, FileText, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

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

const paymentColors: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  partially_paid: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  unpaid: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  overdue: "bg-red-500/10 text-red-700 border-red-500/20",
  credited: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  void: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const fmtKr = (n: number | null | undefined) =>
  `${Number(n || 0).toLocaleString("da-DK")} kr`;
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("da-DK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export default function OrderDetailSheet({ orderId, onClose }: Props) {
  const qc = useQueryClient();
  const [markingPaid, setMarkingPaid] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order-detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses(id, name, slug), order_items(*)")
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: any) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid", paid_at: new Date().toISOString(), paid_amount: order?.total_amount })
        .eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Markeret som betalt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const timeline = useMemo(() => {
    if (!order) return [];
    const items: { icon: any; label: string; ts?: string | null; tone?: string }[] = [
      { icon: FileText, label: "Oprettet", ts: order.created_at, tone: "text-foreground" },
    ];
    if (order.invoiced_at) items.push({ icon: Receipt, label: `Faktureret${order.invoice_external_number ? ` (#${order.invoice_external_number})` : ""}`, ts: order.invoiced_at });
    if (order.paid_at) items.push({ icon: CreditCard, label: `Betalt — ${fmtKr(order.paid_amount)}`, ts: order.paid_at, tone: "text-emerald-700" });
    if (order.last_reminder_at) items.push({ icon: AlertCircle, label: `Rykker sendt${order.last_reminder_type ? ` (${order.last_reminder_type})` : ""}`, ts: order.last_reminder_at, tone: "text-amber-700" });
    if (order.status === "completed") items.push({ icon: CheckCircle2, label: "Afsluttet", ts: order.updated_at, tone: "text-emerald-700" });
    if (order.credited_at) items.push({ icon: Receipt, label: "Krediteret", ts: order.credited_at, tone: "text-violet-700" });
    if (order.voided_at) items.push({ icon: XCircle, label: "Annulleret", ts: order.voided_at, tone: "text-red-700" });
    return items.sort((a, b) => new Date(a.ts || 0).getTime() - new Date(b.ts || 0).getTime());
  }, [order]);

  const overdue = order?.due_date && new Date(order.due_date) < new Date() && order.payment_status !== "paid";

  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !order ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Henter ordre…</div>
        ) : (
          <>
            <SheetHeader className="space-y-2 border-b border-border pb-4">
              <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
                <span>Ordre #{String(order.id).slice(0, 8)}</span>
                <Badge className={`${statusColors[order.status] || ""} border`}>
                  {STATUS_OPTIONS.find((s) => s.value === order.status)?.label || order.status}
                </Badge>
                {order.payment_status && (
                  <Badge className={`${paymentColors[order.payment_status] || ""} border`}>
                    {order.payment_status}
                  </Badge>
                )}
                {overdue && <Badge className="border bg-red-500/10 text-red-700 border-red-500/20">Forfalden</Badge>}
              </SheetTitle>
              <SheetDescription>Oprettet {fmtDate(order.created_at)}</SheetDescription>
            </SheetHeader>

            <div className="space-y-5 py-4">
              {/* Kunde */}
              <Card className="p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{order.customer_name}</p>
                  {order.company_name && <span className="text-xs text-muted-foreground">{order.company_name}{order.cvr ? ` · CVR ${order.cvr}` : ""}</span>}
                </div>
                <a href={`mailto:${order.customer_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" /> {order.customer_email}
                </a>
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Phone className="h-3 w-3" /> {order.customer_phone}
                  </a>
                )}
                {(order.address || order.city) && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {[order.address, order.zip_code, order.city].filter(Boolean).join(", ")}
                  </p>
                )}
              </Card>

              {/* Virksomhed */}
              {order.businesses && (
                <Card className="p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">{order.businesses.name}</span>
                  </div>
                  <Link to={`/${order.businesses.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Profil <ExternalLink className="h-3 w-3" />
                  </Link>
                </Card>
              )}

              {/* Tidslinje */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tidslinje</p>
                <div className="space-y-2.5">
                  {timeline.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <div className="mt-0.5 rounded-full border border-border bg-background p-1">
                          <Icon className={`h-3 w-3 ${t.tone || "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${t.tone || "text-foreground"}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(t.ts)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linjer */}
              {order.order_items?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linjer</p>
                  <Card className="divide-y divide-border">
                    {order.order_items.map((it: any) => (
                      <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                        <span className="text-foreground">{it.service_name} <span className="text-muted-foreground">× {it.quantity}</span></span>
                        <span className="tabular-nums font-medium">{fmtKr(it.total_price)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/40">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-base font-bold tabular-nums">{fmtKr(order.total_amount)}</span>
                    </div>
                  </Card>
                </div>
              )}

              {/* Betaling */}
              <Card className="p-3 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Betaling</p>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Forfald</span>
                  <span className={overdue ? "text-red-700 font-medium" : ""}>{order.due_date ? new Date(order.due_date).toLocaleDateString("da-DK") : "—"}</span>
                  <span className="text-muted-foreground">Betalt</span>
                  <span>{fmtKr(order.paid_amount)} / {fmtKr(order.total_amount)}</span>
                  <span className="text-muted-foreground">Faktura</span>
                  <span>{order.invoice_external_number || "—"}</span>
                  <span className="text-muted-foreground">Rykkere</span>
                  <span>{order.reminder_count || 0}</span>
                </div>
                {order.payment_status !== "paid" && (
                  <Button size="sm" variant="outline" className="w-full h-8 gap-1.5"
                    disabled={markPaid.isPending} onClick={() => markPaid.mutate()}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Markér som betalt
                  </Button>
                )}
              </Card>

              {order.notes && (
                <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold mb-1 text-foreground">Noter</p>{order.notes}
                </div>
              )}

              {/* Status switch */}
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Skift status:</span>
                <Select value={order.status} onValueChange={(v) => updateStatus.mutate(v)}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <a href={`mailto:${order.customer_email}`} className="ml-auto">
                  <Button size="sm" variant="outline" className="h-9 gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Button>
                </a>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}