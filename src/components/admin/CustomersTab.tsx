import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, User, Mail, Phone, MapPin, Package, Repeat, Calendar,
  Route as RouteIcon, TrendingUp, Star, Clock, ChevronRight, ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";
import { Link } from "react-router-dom";

type Customer = {
  email: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  customer_id?: string | null;
  total_revenue: number;
  orders_count: number;
  active_subs: number;
  paused_subs: number;
  last_order_at: string;
  first_order_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  preferred_date: string | null;
  created_at: string;
  notes: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  is_paused?: boolean;
  order_items: Array<{ service_name: string; quantity: number; total_price: number; details: any }>;
};

type SubRow = {
  id: string;
  service_name: string;
  interval: string;
  status: string;
  next_service_date: string | null;
  total_price: number;
  preferred_route_id?: string | null;
  order_id?: string | null;
};

type RouteStopRow = {
  id: string;
  status: string;
  planned_arrival: string | null;
  completed_at: string | null;
  routes: { id: string; route_date: string; name: string | null } | null;
};

type ReviewRow = {
  id: string; rating: number; comment: string | null; created_at: string;
};

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const fmtDate = (d: string | null) => d ? format(parseISO(d), "d. MMM yyyy", { locale: da }) : "—";

/** Aggregate orders by customer email — same email = same customer even if not registered */
const useCustomers = (businessId: string) => {
  return useQuery({
    queryKey: ["customers", businessId],
    queryFn: async (): Promise<Customer[]> => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, customer_phone, customer_id, address, zip_code, city, total_amount, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("customer_id, status")
        .eq("business_id", businessId);

      const activeByCustomer = new Map<string, number>();
      const pausedByCustomer = new Map<string, number>();
      (subs || []).forEach(s => {
        if (!s.customer_id) return;
        if (s.status === "active") activeByCustomer.set(s.customer_id, (activeByCustomer.get(s.customer_id) || 0) + 1);
        if (s.status === "paused") pausedByCustomer.set(s.customer_id, (pausedByCustomer.get(s.customer_id) || 0) + 1);
      });

      const grouped = new Map<string, Customer>();
      (orders || []).forEach(o => {
        const key = o.customer_email.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.total_revenue += Number(o.total_amount || 0);
          existing.orders_count += 1;
          if (o.created_at > existing.last_order_at) {
            existing.last_order_at = o.created_at;
            if (o.customer_name) existing.name = o.customer_name;
            if (o.customer_phone) existing.phone = o.customer_phone;
            if (o.address) existing.address = o.address;
            if (o.zip_code) existing.zip_code = o.zip_code;
            if (o.city) existing.city = o.city;
          }
          if (o.created_at < existing.first_order_at) existing.first_order_at = o.created_at;
        } else {
          grouped.set(key, {
            email: o.customer_email,
            name: o.customer_name,
            phone: o.customer_phone,
            address: o.address,
            zip_code: o.zip_code,
            city: o.city,
            customer_id: o.customer_id,
            total_revenue: Number(o.total_amount || 0),
            orders_count: 1,
            active_subs: o.customer_id ? (activeByCustomer.get(o.customer_id) || 0) : 0,
            paused_subs: o.customer_id ? (pausedByCustomer.get(o.customer_id) || 0) : 0,
            last_order_at: o.created_at,
            first_order_at: o.created_at,
          });
        }
      });

      return Array.from(grouped.values()).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!businessId,
  });
};

const useCustomerDetails = (businessId: string, email: string | null) => {
  return useQuery({
    queryKey: ["customer-details", businessId, email],
    enabled: !!businessId && !!email,
    queryFn: async () => {
      const [ordersRes, subsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total_amount, preferred_date, created_at, notes, address, zip_code, city, order_items(service_name, quantity, total_price, details)")
          .eq("business_id", businessId)
          .ilike("customer_email", email!)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id, service_name, interval, status, next_service_date, total_price")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
      ]);

      const orderIds = (ordersRes.data || []).map(o => o.id);
      let stops: RouteStopRow[] = [];
      let reviews: ReviewRow[] = [];

      if (orderIds.length > 0) {
        const stopsRes = await supabase
          .from("route_stops")
          .select("id, status, planned_arrival, completed_at, routes!inner(id, route_date, name, business_id)")
          .in("order_id", orderIds);
        stops = ((stopsRes.data || []) as any[])
          .filter(s => s.routes?.business_id === businessId)
          .map(s => ({
            id: s.id,
            status: s.status,
            planned_arrival: s.planned_arrival,
            completed_at: s.completed_at,
            routes: s.routes ? { id: s.routes.id, route_date: s.routes.route_date, name: s.routes.name } : null,
          }));
      }

      // Reviews — filter to this customer if signed-in (via customer_id link)
      const customer_id = (ordersRes.data || []).find(o => (o as any).customer_id)?.[Symbol.for("customer_id") as any];
      if (customer_id) {
        const r = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("business_id", businessId)
          .eq("customer_id", customer_id);
        reviews = (r.data || []) as ReviewRow[];
      }

      // Filter subs to this customer (via customer_id from orders)
      const customerIds = new Set((ordersRes.data || []).map((o: any) => o.customer_id).filter(Boolean));
      const filteredSubs = (subsRes.data || []).filter((s: any) =>
        customerIds.size === 0 || customerIds.has(s.customer_id)
      );

      return {
        orders: (ordersRes.data || []) as OrderRow[],
        subscriptions: filteredSubs as SubRow[],
        stops,
        reviews,
      };
    },
  });
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending:     { label: "Afventer",  className: "border-amber-300 text-amber-700 bg-amber-50" },
    confirmed:   { label: "Bekræftet", className: "border-blue-300 text-blue-700 bg-blue-50" },
    in_progress: { label: "Igang",     className: "border-purple-300 text-purple-700 bg-purple-50" },
    completed:   { label: "Udført",    className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
    cancelled:   { label: "Annulleret",className: "border-destructive/40 text-destructive bg-destructive/5" },
    active:      { label: "Aktiv",     className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
    paused:      { label: "Pauset",    className: "border-amber-300 text-amber-700 bg-amber-50" },
  };
  const m = map[status] || { label: status, className: "border-border text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${m.className}`}>{m.label}</Badge>;
};

interface Props { businessId: string }

const CustomersTab = ({ businessId }: Props) => {
  const { data: customers = [], isLoading } = useCustomers(businessId);
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const stats = useMemo(() => {
    const totalRev = customers.reduce((s, c) => s + c.total_revenue, 0);
    const recurring = customers.filter(c => c.active_subs > 0).length;
    return { totalRev, recurring, total: customers.length };
  }, [customers]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Kunder</h2>
        <p className="text-sm text-muted-foreground">Alle dine kunder, deres bestillinger, abonnementer og rutehistorik.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kunder i alt</p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Med abonnement</p>
              <p className="text-xl font-bold text-foreground">{stats.recurring}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Samlet omsætning</p>
              <p className="text-xl font-bold text-foreground">{fmtKr(stats.totalRev)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg på navn, email, telefon eller by..."
          className="pl-9 rounded-xl"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Indlæser kunder...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {customers.length === 0 ? "Ingen kunder endnu" : "Ingen kunder matcher søgningen"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {customers.length === 0 ? "Når du modtager bestillinger dukker kunder op her automatisk." : "Prøv et andet søgeord."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((c) => (
            <button
              key={c.email}
              onClick={() => setSelectedEmail(c.email)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-sm font-semibold text-accent">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr] gap-2 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {c.city || c.address ? `${c.address || ""}${c.address && c.city ? ", " : ""}${c.city || ""}` : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Sidst: {fmtDate(c.last_order_at)}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {c.active_subs > 0 && (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px] h-5 px-1.5 gap-0.5">
                      <Repeat className="h-2.5 w-2.5" />
                      {c.active_subs} abo.
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {c.orders_count} ordrer
                  </Badge>
                  <span className="text-sm font-bold text-foreground tabular-nums w-24 text-right">{fmtKr(c.total_revenue)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <CustomerDetailSheet
        businessId={businessId}
        email={selectedEmail}
        customer={filtered.find(c => c.email === selectedEmail) || null}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
};

const CustomerDetailSheet = ({ businessId, email, customer, onClose }: {
  businessId: string;
  email: string | null;
  customer: Customer | null;
  onClose: () => void;
}) => {
  const { data, isLoading } = useCustomerDetails(businessId, email);

  return (
    <Sheet open={!!email} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {customer && (
          <>
            <SheetHeader className="border-b border-border p-5">
              <SheetTitle className="text-left">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-base font-semibold text-accent shrink-0">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-foreground truncate">{customer.name}</h3>
                    <p className="text-xs text-muted-foreground font-normal">Kunde siden {fmtDate(customer.first_order_at)}</p>
                  </div>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="p-5 space-y-5">
              {/* Contact */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kontakt</h4>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-3 p-3 hover:bg-secondary/40">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground flex-1">{customer.email}</span>
                  </a>
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-3 p-3 hover:bg-secondary/40">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground flex-1">{customer.phone}</span>
                    </a>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-center gap-3 p-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground flex-1">
                        {[customer.address, [customer.zip_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Omsætning</p>
                  <p className="text-base font-bold text-foreground">{fmtKr(customer.total_revenue)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Ordrer</p>
                  <p className="text-base font-bold text-foreground">{customer.orders_count}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Abonnementer</p>
                  <p className="text-base font-bold text-foreground">{customer.active_subs}</p>
                </div>
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Indlæser detaljer...</p>
              ) : (
                <>
                  {/* Subscriptions */}
                  {data && data.subscriptions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5" /> Aktive abonnementer
                      </h4>
                      <div className="space-y-2">
                        {data.subscriptions.map(s => (
                          <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{s.service_name}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-accent/40 text-accent bg-accent/5">
                                    {INTERVAL_LABELS[s.interval] || s.interval}
                                  </Badge>
                                  <StatusBadge status={s.status} />
                                  {s.next_service_date && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Næste: {fmtDate(s.next_service_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{fmtKr(s.total_price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Route history */}
                  {data && data.stops.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <RouteIcon className="h-3.5 w-3.5" /> Rutehistorik ({data.stops.length})
                      </h4>
                      <div className="space-y-1.5">
                        {data.stops
                          .sort((a, b) => (b.routes?.route_date || "").localeCompare(a.routes?.route_date || ""))
                          .slice(0, 8)
                          .map(s => (
                            <Link
                              key={s.id}
                              to={`/virksomhed/ruter?date=${s.routes?.route_date}`}
                              className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 hover:border-accent/40 transition-colors"
                            >
                              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate">
                                  {s.routes?.route_date ? format(parseISO(s.routes.route_date), "EEEE d. MMM yyyy", { locale: da }) : "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">{s.routes?.name || "Rute"}</p>
                              </div>
                              <StatusBadge status={s.status} />
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {data && data.orders.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Bestillinger ({data.orders.length})
                      </h4>
                      <div className="space-y-2">
                        {data.orders.map(o => (
                          <div key={o.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(o.created_at), "d. MMM yyyy, HH:mm", { locale: da })}
                                </p>
                                {o.preferred_date && (
                                  <p className="text-[11px] text-accent flex items-center gap-1 mt-0.5">
                                    <Calendar className="h-3 w-3" />
                                    Ønsket: {format(parseISO(o.preferred_date), "d. MMM yyyy", { locale: da })}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={o.status} />
                                <span className="text-sm font-bold text-foreground tabular-nums">{fmtKr(o.total_amount)}</span>
                              </div>
                            </div>
                            {o.order_items && o.order_items.length > 0 && (
                              <ul className="text-xs text-foreground/80 space-y-0.5">
                                {o.order_items.map((it, i) => (
                                  <li key={i} className="flex justify-between">
                                    <span className="truncate">
                                      {it.quantity > 1 && <span className="text-muted-foreground">{it.quantity}× </span>}
                                      {it.service_name}
                                      {it.details?.interval && it.details.interval !== "engangskøb" && (
                                        <span className="text-accent ml-1">· {INTERVAL_LABELS[it.details.interval] || it.details.interval}</span>
                                      )}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums shrink-0 ml-2">{fmtKr(Number(it.total_price))}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {o.notes && (
                              <p className="text-[11px] text-muted-foreground italic bg-secondary/40 rounded px-2 py-1">📝 {o.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews */}
                  {data && data.reviews.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5" /> Anmeldelser
                      </h4>
                      {data.reviews.map(r => (
                        <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center gap-1 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-[11px] text-muted-foreground ml-2">{fmtDate(r.created_at)}</span>
                          </div>
                          {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CustomersTab;
