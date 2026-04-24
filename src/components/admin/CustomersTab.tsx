import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, Phone, MapPin, Package, Repeat, Calendar,
  Route as RouteIcon, Star, Clock, ChevronRight, ExternalLink, Pause,
  UserPlus, Building2, Pencil, Trash2, ShoppingBag, MoreHorizontal,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";
import { Link } from "react-router-dom";
import CustomerEditDialog, { type EditableCustomer } from "./CustomerEditDialog";
import { PageHeader, PrimaryButton, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { toast } from "sonner";

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
  /** "private" | "business" | "unknown" — kun sat hvis kunden findes i kartoteket */
  type?: "private" | "business" | "unknown";
  /** Saved-customer-id hvis findes (til redigering) */
  saved_id?: string | null;
  company_name?: string | null;
  cvr?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
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

/** Aggregate orders by customer email + merge med privat/erhvervs-kartoteket */
const useCustomers = (businessId: string) => {
  return useQuery({
    queryKey: ["customers", businessId],
    queryFn: async (): Promise<Customer[]> => {
      const [ordersRes, subsRes, privRes, bizRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, customer_name, customer_email, customer_phone, customer_id, address, zip_code, city, total_amount, created_at, company_name, cvr")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("customer_id, status")
          .eq("business_id", businessId),
        supabase
          .from("private_customers")
          .select("id, name, email, phone, address, zip_code, city, notes, avatar_url")
          .eq("business_id", businessId),
        supabase
          .from("business_customers")
          .select("id, company_name, cvr, contact_name, email, phone, address, zip_code, city, notes, avatar_url")
          .eq("business_id", businessId),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      const orders = ordersRes.data || [];
      const subs = subsRes.data || [];
      const privCustomers = privRes.data || [];
      const bizCustomers = bizRes.data || [];

      const activeByCustomer = new Map<string, number>();
      const pausedByCustomer = new Map<string, number>();
      subs.forEach(s => {
        if (!s.customer_id) return;
        if (s.status === "active") activeByCustomer.set(s.customer_id, (activeByCustomer.get(s.customer_id) || 0) + 1);
        if (s.status === "paused") pausedByCustomer.set(s.customer_id, (pausedByCustomer.get(s.customer_id) || 0) + 1);
      });

      const grouped = new Map<string, Customer>();
      orders.forEach(o => {
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
            if (o.company_name) existing.company_name = o.company_name;
            if (o.cvr) existing.cvr = o.cvr;
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
            company_name: o.company_name,
            cvr: o.cvr,
            type: o.company_name || o.cvr ? "business" : "unknown",
          });
        }
      });

      // Merge privat-kartotek
      privCustomers.forEach(p => {
        const key = (p.email || "").toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.type = "private";
          existing.saved_id = p.id;
          if (!existing.name && p.name) existing.name = p.name;
          if (!existing.phone && p.phone) existing.phone = p.phone;
          if (!existing.address && p.address) existing.address = p.address;
          if (!existing.zip_code && p.zip_code) existing.zip_code = p.zip_code;
          if (!existing.city && p.city) existing.city = p.city;
          existing.notes = p.notes;
          existing.avatar_url = p.avatar_url ?? existing.avatar_url ?? null;
        } else {
          grouped.set(key, {
            email: p.email,
            name: p.name,
            phone: p.phone,
            address: p.address,
            zip_code: p.zip_code,
            city: p.city,
            customer_id: null,
            total_revenue: 0,
            orders_count: 0,
            active_subs: 0,
            paused_subs: 0,
            last_order_at: "",
            first_order_at: "",
            type: "private",
            saved_id: p.id,
            notes: p.notes,
            avatar_url: p.avatar_url ?? null,
          });
        }
      });

      // Merge erhvervs-kartotek
      bizCustomers.forEach(b => {
        const key = (b.email || "").toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.type = "business";
          existing.saved_id = b.id;
          existing.company_name = b.company_name;
          existing.cvr = b.cvr;
          existing.contact_name = b.contact_name;
          if (!existing.name && (b.contact_name || b.company_name)) existing.name = b.contact_name || b.company_name;
          if (!existing.phone && b.phone) existing.phone = b.phone;
          if (!existing.address && b.address) existing.address = b.address;
          if (!existing.zip_code && b.zip_code) existing.zip_code = b.zip_code;
          if (!existing.city && b.city) existing.city = b.city;
          existing.notes = b.notes;
          existing.avatar_url = b.avatar_url ?? existing.avatar_url ?? null;
        } else {
          grouped.set(key, {
            email: b.email,
            name: b.contact_name || b.company_name,
            phone: b.phone,
            address: b.address,
            zip_code: b.zip_code,
            city: b.city,
            customer_id: null,
            total_revenue: 0,
            orders_count: 0,
            active_subs: 0,
            paused_subs: 0,
            last_order_at: "",
            first_order_at: "",
            type: "business",
            saved_id: b.id,
            company_name: b.company_name,
            cvr: b.cvr,
            contact_name: b.contact_name,
            notes: b.notes,
            avatar_url: b.avatar_url ?? null,
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
          .select("id, service_name, interval, status, next_service_date, total_price, preferred_route_id, order_id, customer_id")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
      ]);

      const orderIds = (ordersRes.data || []).map(o => o.id);
      let stops: RouteStopRow[] = [];
      let reviews: ReviewRow[] = [];
      let preferredRoutes: Record<string, { name: string | null; route_date: string }> = {};

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

      // Filter subs to this customer
      const customerIds = new Set((ordersRes.data || []).map((o: any) => o.customer_id).filter(Boolean));
      const filteredSubs = (subsRes.data || []).filter((s: any) =>
        customerIds.size === 0 || customerIds.has(s.customer_id)
      ) as SubRow[];

      // Look up preferred route names
      const prefIds = Array.from(new Set(filteredSubs.map(s => s.preferred_route_id).filter(Boolean))) as string[];
      if (prefIds.length > 0) {
        const r = await supabase.from("routes").select("id, name, route_date").in("id", prefIds);
        (r.data || []).forEach((rt: any) => {
          preferredRoutes[rt.id] = { name: rt.name, route_date: rt.route_date };
        });
      }

      // Mark each order as paused if all its (recurring) subs are paused/cancelled
      const subsByOrder = new Map<string, SubRow[]>();
      filteredSubs.forEach(s => {
        if (!s.order_id) return;
        const arr = subsByOrder.get(s.order_id) || [];
        arr.push(s);
        subsByOrder.set(s.order_id, arr);
      });
      const orders: OrderRow[] = (ordersRes.data || []).map((o: any) => {
        const linked = subsByOrder.get(o.id) || [];
        const isPaused = linked.length > 0 && linked.every(s => s.status === "paused" || s.status === "cancelled");
        return { ...o, is_paused: isPaused };
      });

      // Reviews
      const customer_id = Array.from(customerIds)[0];
      if (customer_id) {
        const r = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("business_id", businessId)
          .eq("customer_id", customer_id);
        reviews = (r.data || []) as ReviewRow[];
      }

      return {
        orders,
        subscriptions: filteredSubs,
        stops,
        reviews,
        preferredRoutes,
      };
    },
  });
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; dot: string }> = {
    pending:     { label: "Afventer",   dot: "bg-amber-500" },
    confirmed:   { label: "Bekræftet",  dot: "bg-blue-500" },
    in_progress: { label: "I gang",     dot: "bg-violet-500" },
    completed:   { label: "Udført",     dot: "bg-emerald-500" },
    cancelled:   { label: "Annulleret", dot: "bg-destructive" },
    active:      { label: "Aktiv",      dot: "bg-emerald-500" },
    paused:      { label: "Pauset",     dot: "bg-amber-500" },
  };
  const m = map[status] || { label: status, dot: "bg-muted-foreground/40" };
  return (
    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-border bg-secondary text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  );
};

interface Props { businessId: string; businessName?: string }

const CustomersTab = ({ businessId, businessName }: Props) => {
  const qc = useQueryClient();
  const { data: customers = [], isLoading } = useCustomers(businessId);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "private" | "business">("all");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditableCustomer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; targets: Customer[] } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let list = customers;
    if (typeFilter !== "all") {
      list = list.filter(c => c.type === typeFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.company_name || "").toLowerCase().includes(q) ||
      (c.cvr || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q)
    );
  }, [customers, search, typeFilter]);

  const stats = useMemo(() => {
    const totalRev = customers.reduce((s, c) => s + c.total_revenue, 0);
    const recurring = customers.filter(c => c.active_subs > 0).length;
    const privateCount = customers.filter(c => c.type === "private").length;
    const businessCount = customers.filter(c => c.type === "business").length;
    return { totalRev, recurring, total: customers.length, privateCount, businessCount };
  }, [customers]);

  const openCreateDialog = () => {
    setEditing(null);
    setEditDialogOpen(true);
  };

  const openEditDialog = (c: Customer) => {
    if (!c.saved_id || !c.type || c.type === "unknown") {
      // Tillad redigering også af ikke-gemte (fra ordrer) — opret ny kartotek-entry
      setEditing({
        type: c.cvr || c.company_name ? "business" : "private",
        name: c.name,
        company_name: c.company_name || undefined,
        cvr: c.cvr || undefined,
        contact_name: c.contact_name || undefined,
        email: c.email,
        phone: c.phone,
        address: c.address,
        zip_code: c.zip_code,
        city: c.city,
        notes: c.notes,
        avatar_url: c.avatar_url ?? null,
      });
    } else {
      setEditing({
        id: c.saved_id,
        type: c.type,
        name: c.name,
        company_name: c.company_name || undefined,
        cvr: c.cvr || undefined,
        contact_name: c.contact_name || undefined,
        email: c.email,
        phone: c.phone,
        address: c.address,
        zip_code: c.zip_code,
        city: c.city,
        notes: c.notes,
        avatar_url: c.avatar_url ?? null,
      });
    }
    setEditDialogOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const eligible = filtered.filter(c => c.saved_id);
    if (selectedIds.size === eligible.length && eligible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map(c => c.saved_id!)));
    }
  };

  const selectedCustomers = useMemo(
    () => filtered.filter(c => c.saved_id && selectedIds.has(c.saved_id)),
    [filtered, selectedIds]
  );

  const handleDelete = async (targets: Customer[]) => {
    setDeleting(true);
    try {
      const privIds = targets.filter(c => c.type === "private" && c.saved_id).map(c => c.saved_id!);
      const bizIds = targets.filter(c => c.type === "business" && c.saved_id).map(c => c.saved_id!);
      const promises: Promise<any>[] = [];
      if (privIds.length) promises.push(Promise.resolve(supabase.from("private_customers").delete().in("id", privIds)));
      if (bizIds.length) promises.push(Promise.resolve(supabase.from("business_customers").delete().in("id", bizIds)));
      const results = await Promise.all(promises);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw firstError;
      qc.invalidateQueries({ queryKey: ["customers", businessId] });
      qc.invalidateQueries({ queryKey: ["saved-customers", businessId] });
      toast.success(targets.length === 1 ? "Kunde slettet" : `${targets.length} kunder slettet`);
      setSelectedIds(new Set());
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke slette");
    } finally {
      setDeleting(false);
    }
  };

  const openCreateOrderForCustomer = (c: Customer) => {
    openEditDialog(c);
  };

  const eligibleSelectable = filtered.filter(c => c.saved_id);
  const allSelected = eligibleSelectable.length > 0 && selectedIds.size === eligibleSelectable.length;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      <PageHeader
        title="Kunder"
        description="Alle dine kunder, deres bestillinger, abonnementer og rutehistorik."
        action={
          <PrimaryButton onClick={openCreateDialog} icon={<UserPlus />}>
            Tilføj kunde
          </PrimaryButton>
        }
      />

      {/* Stats + filters */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kunder i alt</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Med abonnement</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{stats.recurring}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Samlet omsætning</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{fmtKr(stats.totalRev)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {[
            { key: "all", label: "Alle", count: stats.total },
            { key: "private", label: "Privat", count: stats.privateCount },
            { key: "business", label: "Erhverv", count: stats.businessCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key as any)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                typeFilter === key
                  ? "border-border bg-secondary text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 tabular-nums">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Søg navn, email, firma, CVR eller by..." />
      </div>

      {/* Bulk actions bar */}
      {selectedCustomers.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="text-sm text-foreground">
              <span className="font-semibold">{selectedCustomers.length}</span> kunde{selectedCustomers.length === 1 ? "" : "r"} valgt
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}
                className="h-8 rounded-lg text-xs text-foreground hover:bg-secondary hover:text-foreground">
                Fravælg alle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete({ open: true, targets: selectedCustomers })}
                className="h-8 rounded-lg border-border text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Slet valgte
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Indlæser kunder...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<User />}
          title={customers.length === 0 ? "Ingen kunder endnu" : "Ingen kunder matcher søgningen"}
          description={customers.length === 0 ? "Tilføj din første kunde, eller vent til der kommer bestillinger ind." : "Prøv et andet søgeord."}
          action={customers.length === 0 ? (
            <PrimaryButton onClick={openCreateDialog} icon={<UserPlus />}>Tilføj kunde</PrimaryButton>
          ) : undefined}
        />
      ) : (
        <>
          {/* Kundeliste — samme struktur som "Seneste bestillinger" på Overblik:
              ét stort kort med header-bar, og rækker adskilt af divide-y */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3 min-w-0">
                {eligibleSelectable.length > 0 && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Vælg alle"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {typeFilter === "private" ? "Private kunder" : typeFilter === "business" ? "Erhvervskunder" : "Alle kunder"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? "kunde" : "kunder"}
                    {selectedCustomers.length > 0 && ` · ${selectedCustomers.length} valgt`}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="w-20 text-right">Bestillinger</span>
                <span className="w-24 text-right">Omsætning</span>
                <span className="w-6" />
              </div>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((c) => {
                const typeLabel = c.type === "business" ? "Erhverv" : c.type === "private" ? "Privat" : null;
                const typeDot = c.type === "business" ? "bg-blue-500" : c.type === "private" ? "bg-emerald-500" : "bg-muted-foreground/40";
                const displayName = c.type === "business" && c.company_name ? c.company_name : c.name;
                const metaParts: string[] = [];
                if (c.last_order_at) metaParts.push(`Sidst: ${fmtDate(c.last_order_at)}`);
                if (c.city) metaParts.push(c.city);
                else if (c.email) metaParts.push(c.email);
                return (
                  <div
                    key={c.email}
                    className="group grid w-full gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5
                               sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center"
                  >
                    {/* Checkbox — fast plads også når tom, så rækker linjer ud */}
                    <div className="shrink-0 w-4 flex items-center justify-center">
                      {c.saved_id && (
                        <Checkbox
                          checked={selectedIds.has(c.saved_id)}
                          onCheckedChange={() => toggleSelect(c.saved_id!)}
                          aria-label={`Vælg ${c.name}`}
                        />
                      )}
                    </div>

                    {/* Navn + type + meta — klik åbner detaljer */}
                    <button
                      type="button"
                      onClick={() => setSelectedEmail(c.email)}
                      className="min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Avatar/logo — falder tilbage til ikon hvis intet billede */}
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                            {c.type === "business"
                              ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                        {typeLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground shrink-0">
                            <span className={`h-1.5 w-1.5 rounded-full ${typeDot}`} />
                            {typeLabel}
                          </span>
                        )}
                        {c.active_subs > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {c.active_subs} abo.
                          </span>
                        )}
                        {c.paused_subs > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {c.paused_subs} pauseret
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {metaParts.join(" · ") || "Ingen bestillinger endnu"}
                      </div>
                    </button>

                    {/* Bestillinger */}
                    <div className="hidden sm:block w-20 text-right text-sm tabular-nums text-foreground">
                      {c.orders_count > 0 ? c.orders_count : <span className="text-muted-foreground">—</span>}
                    </div>

                    {/* Omsætning */}
                    <div className="hidden sm:block w-24 text-right text-sm font-semibold tabular-nums text-foreground">
                      {c.total_revenue > 0 ? fmtKr(c.total_revenue) : <span className="font-normal text-muted-foreground">—</span>}
                    </div>

                    {/* Handlinger */}
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            aria-label="Handlinger"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setSelectedEmail(c.email)} className="text-foreground focus:text-foreground">
                            <ExternalLink className="h-4 w-4 mr-2" /> Se detaljer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCreateOrderForCustomer(c)} className="text-foreground focus:text-foreground">
                            <ShoppingBag className="h-4 w-4 mr-2" /> Opret bestilling
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(c)} className="text-foreground focus:text-foreground">
                            <Pencil className="h-4 w-4 mr-2" /> Rediger kunde
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {c.saved_id ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete({ open: true, targets: [c] })}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Slet kunde
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled
                              className="text-muted-foreground"
                              title="Kunden er kun kendt fra ordrer og findes ikke i dit kartotek. Tilføj kunden først via 'Rediger kunde', hvorefter du kan slette den."
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Kan ikke slettes
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Detail sheet */}
      <CustomerDetailSheet
        businessId={businessId}
        email={selectedEmail}
        customer={filtered.find(c => c.email === selectedEmail) || null}
        onClose={() => setSelectedEmail(null)}
      />

      {/* Create / edit dialog */}
      <CustomerEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        businessId={businessId}
        businessName={businessName || ""}
        initial={editing}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete?.open} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Slet {confirmDelete?.targets.length === 1 ? "kunde" : `${confirmDelete?.targets.length} kunder`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kundeoplysninger fjernes fra dit kartotek. Tidligere bestillinger og abonnementer bevares,
              men kunden vil ikke længere fremgå af kundelisten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-foreground hover:bg-secondary hover:text-foreground">Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete.targets)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Sletter..." : "Slet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
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
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-base font-semibold text-foreground shrink-0">
                    {customer.type === "business" ? <Building2 className="h-5 w-5" /> : customer.name.charAt(0).toUpperCase()}
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
                  {/* Subscriptions — split active vs paused */}
                  {data && data.subscriptions.length > 0 && (() => {
                    const activeSubs = data.subscriptions.filter(s => s.status === "active");
                    const pausedSubs = data.subscriptions.filter(s => s.status === "paused");
                    const cancelledSubs = data.subscriptions.filter(s => s.status === "cancelled");
                    const renderSub = (s: SubRow) => {
                      const pref = s.preferred_route_id ? data.preferredRoutes[s.preferred_route_id] : null;
                      return (
                        <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{s.service_name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-accent/40 text-accent bg-accent/5">
                                  {INTERVAL_LABELS[s.interval] || s.interval}
                                </Badge>
                                <StatusBadge status={s.status} />
                                {s.status === "active" && s.next_service_date && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Næste: {fmtDate(s.next_service_date)}
                                  </span>
                                )}
                                {s.status === "paused" && (
                                  <span className="text-[11px] text-amber-700 flex items-center gap-1">
                                    <Pause className="h-3 w-3" />
                                    Indgår ikke i ruteplanlægning
                                  </span>
                                )}
                                {pref && (
                                  <Link to={`/virksomhed/ruter?date=${pref.route_date}`} className="text-[11px] text-accent flex items-center gap-1 hover:underline">
                                    <RouteIcon className="h-3 w-3" />
                                    Sædvanlig rute: {pref.name || "Rute"}
                                  </Link>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{fmtKr(s.total_price)}</span>
                          </div>
                        </div>
                      );
                    };
                    return (
                      <div className="space-y-4">
                        {activeSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Repeat className="h-3.5 w-3.5" /> Aktive abonnementer ({activeSubs.length})
                            </h4>
                            <div className="space-y-2">{activeSubs.map(renderSub)}</div>
                          </div>
                        )}
                        {pausedSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                              <Pause className="h-3.5 w-3.5" /> På pause ({pausedSubs.length})
                            </h4>
                            <p className="text-[11px] text-muted-foreground">Disse abonnementer indgår ikke i ruteplanlægning. Når kunden genoptager dem, vises de igen — gerne på samme rute som før.</p>
                            <div className="space-y-2">{pausedSubs.map(renderSub)}</div>
                          </div>
                        )}
                        {cancelledSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Repeat className="h-3.5 w-3.5" /> Opsagte ({cancelledSubs.length})
                            </h4>
                            <div className="space-y-2 opacity-60">{cancelledSubs.map(renderSub)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                                {o.is_paused && (
                                  <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-0.5 font-medium">
                                    <Pause className="h-3 w-3" />
                                    Abonnementet er på pause — indgår ikke i ruteplanlægning
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {o.is_paused
                                  ? <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-300 text-amber-700 bg-amber-50">På pause</Badge>
                                  : <StatusBadge status={o.status} />}
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
