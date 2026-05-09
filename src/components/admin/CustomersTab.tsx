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
  CreditCard, Contact as ContactIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";
import { Link } from "react-router-dom";
import CustomerEditDialog, { type EditableCustomer } from "./CustomerEditDialog";
import { PageHeader, PrimaryButton, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton, DialogDetailsSkeleton } from "@/components/admin/shared/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AccountingStatusRow,
  CustomerOrderStatusSummary,
  derivePaymentStatus,
  summarizeCustomerOrders,
  type CustomerOrderSummary,
  type OrderForStatus,
} from "@/components/shared/OrderStatusBadges";

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
  live_orders_count?: number;
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
  /** Aggregeret faktura-/betalingsstatus på tværs af alle kundens aftaler */
  accounting_summary?: CustomerOrderSummary;
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
  payment_status?: string | null;
  paid_at?: string | null;
  payment_status_synced_at?: string | null;
  due_date?: string | null;
  invoice_external_id?: string | null;
  invoiced_at?: string | null;
  invoice_status?: string | null;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  last_reminder_type?: string | null;
  reminder_history?: any;
  credited_at?: string | null;
  voided_at?: string | null;
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
  customer_id?: string | null;
  created_at?: string | null;
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
          .select("id, status, customer_name, customer_email, customer_phone, customer_id, address, zip_code, city, total_amount, created_at, company_name, cvr, payment_status, paid_at, due_date, invoice_external_id, invoiced_at, reminder_count, last_reminder_at, last_reminder_type, credited_at, voided_at")
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
      const ordersByCustomer = new Map<string, OrderForStatus[]>();
      orders.forEach(o => {
        const key = o.customer_email.toLowerCase();
        const accOrder: OrderForStatus = {
          status: (o as any).status,
          payment_status: (o as any).payment_status,
          paid_at: (o as any).paid_at,
          due_date: (o as any).due_date,
          invoice_external_id: (o as any).invoice_external_id,
          invoiced_at: (o as any).invoiced_at,
          reminder_count: (o as any).reminder_count,
          last_reminder_at: (o as any).last_reminder_at,
          last_reminder_type: (o as any).last_reminder_type,
          credited_at: (o as any).credited_at,
          voided_at: (o as any).voided_at,
        };
        const arr = ordersByCustomer.get(key) || [];
        arr.push(accOrder);
        ordersByCustomer.set(key, arr);
        const existing = grouped.get(key);
        const isLiveOrder = !["cancelled", "rejected"].includes((o as any).status);
        if (existing) {
          existing.total_revenue += Number(o.total_amount || 0);
          existing.orders_count += 1;
          existing.live_orders_count = (existing.live_orders_count || 0) + (isLiveOrder ? 1 : 0);
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
            live_orders_count: isLiveOrder ? 1 : 0,
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

      // Beregn summary pr. kunde efter alle ordrer er talt op.
      grouped.forEach((c, key) => {
        const list = ordersByCustomer.get(key) || [];
        c.accounting_summary = summarizeCustomerOrders(list);
      });

      // Merge privat-kartotek
      privCustomers.forEach(p => {
        const key = (p.email || "").toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.type = "private";
          existing.saved_id = p.id;
          // Kartoteket er master — overskriv altid værdier fra ordrer så
          // ændringer i kunde-dialogen vises straks (ordrer kan have gamle
          // navne/adresser fra dengang ordren blev oprettet).
          if (p.name) existing.name = p.name;
          if (p.phone) existing.phone = p.phone;
          if (p.address) existing.address = p.address;
          if (p.zip_code) existing.zip_code = p.zip_code;
          if (p.city) existing.city = p.city;
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
            live_orders_count: 0,
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
          // Kartoteket er master — overskriv altid felter fra ordrer.
          if (b.contact_name || b.company_name) existing.name = b.contact_name || b.company_name;
          if (b.phone) existing.phone = b.phone;
          if (b.address) existing.address = b.address;
          if (b.zip_code) existing.zip_code = b.zip_code;
          if (b.city) existing.city = b.city;
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
            live_orders_count: 0,
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
          .select("id, status, total_amount, preferred_date, created_at, notes, address, zip_code, city, payment_status, paid_at, payment_status_synced_at, due_date, invoice_external_id, invoiced_at, invoice_status, reminder_count, last_reminder_at, last_reminder_type, reminder_history, credited_at, voided_at, order_items(service_name, quantity, total_price, details)")
          .eq("business_id", businessId)
          .ilike("customer_email", email!)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id, service_name, interval, status, next_service_date, total_price, preferred_route_id, order_id, customer_id, created_at")
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

      // Filter subs to this customer + skil dem fra annullerede ordrer fra
      // (de er reelt døde abonnementer). Dedupliker også på (order_id,
      // service_id) — der kan være race-conditions der har skabt flere
      // subscriptions for samme service på samme ordre.
      const customerIds = new Set((ordersRes.data || []).map((o: any) => o.customer_id).filter(Boolean));
      const orderById = new Map((ordersRes.data || []).map((o: any) => [o.id, o]));
      const allSubs = (subsRes.data || []).filter((s: any) =>
        customerIds.size === 0 || customerIds.has(s.customer_id)
      ) as SubRow[];
      // Drop subs hvis tilknyttede ordre er cancelled
      const livingSubs = allSubs.filter(s => {
        if (!s.order_id) return true;
        const o = orderById.get(s.order_id);
        if (!o) return true;
        return o.status !== "cancelled";
      });
      // Dedupe — én pr. (kunde, service). Det forhindrer at den samme aftale
      // dukker op flere gange selvom der findes legacy-rækker pr. ordre.
      // Vi beholder den nyeste/active-versionen.
      const rank = (st: string) => st === "active" ? 4 : st === "paused" ? 3 : st === "pending" ? 2 : st === "cancelled" ? 1 : 0;
      const seen = new Map<string, SubRow>();
      const sorted = [...livingSubs].sort((a, b) => {
        const r = rank(b.status) - rank(a.status);
        if (r !== 0) return r;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      for (const s of sorted) {
        const key = `${s.customer_id || "anon"}::${(s as any).service_id || s.service_name}`;
        if (!seen.has(key)) seen.set(key, s);
      }
      const filteredSubs = Array.from(seen.values());

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
    pending:     { label: "Afventer planlægning", dot: "bg-warning" },
    confirmed:   { label: "Planlagt",             dot: "bg-info" },
    in_progress: { label: "Under udførelse",      dot: "bg-accent" },
    completed:   { label: "Udført",               dot: "bg-success" },
    cancelled:   { label: "Annulleret",           dot: "bg-destructive" },
    active:      { label: "Aktiv",                dot: "bg-success" },
    paused:      { label: "På pause",             dot: "bg-warning" },
  };
  const m = map[status] || { label: status, dot: "bg-muted-foreground/40" };
  return (
    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-border bg-secondary text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  );
};

/** Betalingsstatus — hentes altid fra regnskabsprogrammet. */
const PaymentBadge = ({ status, syncedAt }: { status?: string | null; syncedAt?: string | null }) => {
  if (!status) return null;
  const map: Record<string, { label: string; dot: string; help: string }> = {
    unpaid:          { label: "Ikke betalt",     dot: "bg-muted-foreground/50", help: "Faktura er sendt, men endnu ikke betalt." },
    sent:            { label: "Faktura sendt",   dot: "bg-info",                help: "Faktura er sendt til kunden via dit regnskabsprogram." },
    partially_paid:  { label: "Delvist betalt",  dot: "bg-warning",             help: "Kunden har betalt en del af fakturaen." },
    paid:            { label: "Betalt",          dot: "bg-success",             help: "Fakturaen er fuldt betalt." },
    overdue:         { label: "Forfalden",       dot: "bg-destructive",         help: "Betalingsfristen er overskredet." },
    credited:        { label: "Krediteret",      dot: "bg-muted-foreground/50", help: "Fakturaen er krediteret med en kreditnota." },
    refunded:        { label: "Refunderet",      dot: "bg-muted-foreground/50", help: "Beløbet er ført tilbage til kunden." },
    cancelled:       { label: "Annulleret",      dot: "bg-muted-foreground/50", help: "Fakturaen er annulleret." },
  };
  const m = map[status];
  if (!m) return null;
  const synced = syncedAt ? format(parseISO(syncedAt), "d. MMM yyyy HH:mm", { locale: da }) : null;
  return (
    <Badge
      variant="outline"
      className="text-[10px] h-5 px-1.5 gap-1 border-border bg-secondary text-foreground"
      title={`${m.help}\nHentes automatisk fra dit regnskabsprogram hvert 15. minut.${synced ? `\nSidst opdateret: ${synced}.` : ""}`}
    >
      <CreditCard className="h-2.5 w-2.5" />
      {m.label}
    </Badge>
  );
};

/** Samlet kundestatus i ét pille-element — fortæller hurtigt hvad slags kunde det er. */
const CustomerStatusPill = ({ c }: { c: Customer }) => {
  // Vi bestemmer status ud fra hvad der er mest sigende for kunden lige nu:
  //   1) Aktive abonnementer  → "Fast kunde"
  //   2) Kun pausede abos    → "På pause"
  //   3) Aftale inden for 90 dage → "Aktiv kunde"
  //   4) Aftaler men ingen aktivitet i 90+ dage → "Tidligere kunde"
  //   5) Én aftale i alt     → "Engangskunde"
  //   6) Kun i kartotek      → "Ny i kartotek"
  let label: string;
  let dot: string;
  let icon: React.ReactNode;
  let help: string;

  const daysSinceLast = c.last_order_at
    ? Math.floor((Date.now() - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isRecent = daysSinceLast !== null && daysSinceLast <= 90;

  if (c.active_subs > 0) {
    const extra = c.paused_subs > 0 ? ` (+${c.paused_subs} på pause)` : "";
    label = `Fast kunde · ${c.active_subs} aktiv${c.active_subs === 1 ? "" : "e"}${extra}`;
    dot = "bg-emerald-500";
    icon = <Repeat className="h-3 w-3" />;
    help =
      c.paused_subs > 0
        ? `Kunden har ${c.active_subs} aktivt/aktive abonnement(er) der kører automatisk, og ${c.paused_subs} der er sat på pause.`
        : "Kunden har et eller flere aktive abonnementer der kører automatisk efter aftalt interval.";
  } else if (c.paused_subs > 0) {
    label = `Pause · ${c.paused_subs} abonnement${c.paused_subs === 1 ? "" : "er"}`;
    dot = "bg-amber-500";
    icon = <Pause className="h-3 w-3" />;
    help = "Alle kundens abonnementer er sat på pause. De indgår ikke i ruteplanlægningen, men kan genoptages når som helst.";
  } else if (c.orders_count > 0 && isRecent) {
    label = c.orders_count === 1
      ? "Aktiv kunde · 1 aftale"
      : `Aktiv kunde · ${c.orders_count} aftaler`;
    dot = "bg-emerald-500";
    icon = <Package className="h-3 w-3" />;
    help = `Kunden har ${c.orders_count === 1 ? "én aftale" : `${c.orders_count} aftaler`} og har handlet hos jer inden for de sidste 90 dage. Kunden har ikke et fast abonnement endnu.`;
  } else if (c.orders_count > 0) {
    label = c.orders_count === 1
      ? "Engangskunde"
      : `Tidligere kunde · ${c.orders_count} aftaler`;
    dot = "bg-blue-500";
    icon = <Package className="h-3 w-3" />;
    help = c.orders_count === 1
      ? "Kunden har haft én aftale hos jer, og der er gået mere end 90 dage siden sidst."
      : `Kunden har haft ${c.orders_count} aftaler hos jer, men har ikke et fast abonnement og har ikke handlet i mere end 90 dage.`;
  } else {
    label = "Ny i kartotek";
    dot = "bg-muted-foreground/40";
    icon = <ContactIcon className="h-3 w-3" />;
    help = "Kunden er gemt i jeres kartotek, men har endnu ikke nogen aftaler eller abonnementer.";
  }

  return (
    <span
      title={help}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground shrink-0"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {icon}
      {label}
    </span>
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
    // Antal kunder med mindst én forfalden faktura eller udsendt rykker — så
    // brugeren straks kan se hvor mange kunder der reelt mangler at betale.
    const withOverdue = customers.filter(c =>
      (c.accounting_summary?.overdue ?? 0) > 0 || (c.accounting_summary?.reminders ?? 0) > 0
    ).length;
    return { totalRev, recurring, total: customers.length, privateCount, businessCount, withOverdue };
  }, [customers]);

  const openCreateDialog = () => {
    setEditing(null);
    setEditDialogOpen(true);
  };

  const openEditDialog = async (c: Customer) => {
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
      // Hent fulde regnskabsfelter direkte fra kartoteket
      const table = c.type === "business" ? "business_customers" : "private_customers";
      const { data: full } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", c.saved_id)
        .maybeSingle();
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
        customer_number: (full as any)?.customer_number ?? null,
        customer_group: (full as any)?.customer_group ?? null,
        vat_zone: (full as any)?.vat_zone ?? null,
        is_blocked: (full as any)?.is_blocked ?? false,
        payment_terms_days: (full as any)?.payment_terms_days ?? null,
        ean_number: (full as any)?.ean_number ?? null,
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

  // Vi bruger nu en stabil nøgle pr. kunde (saved_id hvis findes, ellers email-lowercase)
  // så også ikke-gemte kunder kan vælges og slettes.
  const customerKey = (c: Customer) => c.saved_id || `email:${c.email.toLowerCase()}`;

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(customerKey)));
    }
  };

  const selectedCustomers = useMemo(
    () => filtered.filter(c => selectedIds.has(customerKey(c))),
    [filtered, selectedIds]
  );

  const handleDelete = async (targets: Customer[]) => {
    setDeleting(true);
    try {
      // Vi sletter kunden HELT — både kartotek-post (hvis den findes) OG alle
      // ordrer/abonnementer hos denne virksomhed. Tidligere ryddede vi kun
      // kartoteket for "gemte" kunder, hvorefter kunden dukkede op igen i
      // listen som "kun kendt fra ordrer", så brugeren skulle slette to gange.

      // 1) Saml kartotek-IDs (gemte privat-/erhvervskunder) til at slette i kartoteket.
      const privIds = targets.filter(c => c.type === "private" && c.saved_id).map(c => c.saved_id!);
      const bizIds = targets.filter(c => c.type === "business" && c.saved_id).map(c => c.saved_id!);

      // 2) Saml ALLE emails — også for kartotek-kunder — så vi rydder ordrer
      //    og abonnementer der ellers ville få kunden til at dukke op igen.
      const allEmails = Array.from(
        new Set(targets.map(c => (c.email || "").toLowerCase()).filter(Boolean))
      );

      const promises: Promise<any>[] = [];
      if (privIds.length) promises.push(Promise.resolve(supabase.from("private_customers").delete().in("id", privIds)));
      if (bizIds.length) promises.push(Promise.resolve(supabase.from("business_customers").delete().in("id", bizIds)));

      // Slet ordrer + ordre-linjer + abonnementer for ALLE valgte kunder
      // hos denne virksomhed, så de forsvinder helt fra listen i ét tryk.
      for (const email of allEmails) {
        // Find ordrer for kunden hos denne virksomhed
        const { data: customerOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("business_id", businessId)
          .ilike("customer_email", email);
        const orderIds = (customerOrders || []).map((o: any) => o.id);
        if (orderIds.length > 0) {
          // Slet abonnementer der er knyttet til ordrerne først
          await supabase.from("subscriptions").delete().in("order_id", orderIds);
          // Order_items ryddes via cascade i de fleste tilfælde, ellers manuelt
          await supabase.from("order_items").delete().in("order_id", orderIds);
          await supabase.from("orders").delete().in("id", orderIds);
        }
      }

      const results = await Promise.all(promises);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw firstError;
      qc.invalidateQueries({ queryKey: ["customers", businessId] });
      qc.invalidateQueries({ queryKey: ["saved-customers", businessId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
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

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      <PageHeader
        title="Kunder"
        description={(() => {
          const parts: string[] = [`${stats.total} ${stats.total === 1 ? "kunde" : "kunder"}`];
          if (stats.recurring > 0) parts.push(`${stats.recurring} ${stats.recurring === 1 ? "fast" : "faste"}`);
          if (stats.withOverdue > 0) parts.push(`${stats.withOverdue} med forfalden betaling`);
          return parts.join(" · ");
        })()}
        action={
          <PrimaryButton onClick={openCreateDialog} icon={<UserPlus />}>
            Tilføj kunde
          </PrimaryButton>
        }
      />

      {/* Forfalden betaling — vises kun når relevant, så fokus er på handling */}
      {stats.withOverdue > 0 && (
        <Card className="surface-admin rounded-xl border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Forfalden betaling</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.withOverdue} {stats.withOverdue === 1 ? "kunde" : "kunder"} med forfaldne fakturaer eller rykkere
              </p>
            </div>
            <p className="text-xl font-semibold tabular-nums text-destructive shrink-0">{stats.withOverdue}</p>
          </CardContent>
        </Card>
      )}

      {/* Søg + type-filter på samme linje — kompakt værktøjsbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Søg navn, email, firma, CVR eller by..." />
        </div>
        <div className="inline-flex flex-wrap items-center gap-0 rounded-lg border border-border bg-card p-0.5 shadow-sm">
          {[
            { key: "all", label: "Alle", count: stats.total },
            { key: "private", label: "Privat", count: stats.privateCount },
            { key: "business", label: "Erhverv", count: stats.businessCount },
          ].map(({ key, label, count }) => {
            const isActive = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key as any)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-black/15 text-current" : "bg-secondary text-foreground/70"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status-guide — kompakt hjælp, foldet sammen som standard */}
      <details className="group rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
          <span className="font-medium text-foreground">Sådan læser du kundestatus</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p><span className="font-medium text-foreground">Fast kunde</span> — har mindst ét aktivt abonnement der kører automatisk.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p><span className="font-medium text-foreground">Aktiv kunde</span> — har handlet hos jer inden for de sidste 90 dage, men uden fast abonnement.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <p><span className="font-medium text-foreground">Pause</span> — alle abonnementer er sat på pause og indgår ikke i ruteplanlægning.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            <p><span className="font-medium text-foreground">Engangs- / tidligere kunde</span> — har haft én eller flere aftaler, men intet aktivt nu og ingen handel i 90+ dage.</p>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <p><span className="font-medium text-foreground">Ny i kartotek</span> — gemt manuelt, men har endnu ikke nogen aftaler.</p>
          </div>
        </div>
      </details>

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
        <ListCardSkeleton rows={6} />
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
                {filtered.length > 0 && (
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
              {/* Kolonne-titler: matcher præcis bredde og rækkefølge i hver række
                  (aftaler w-20, omsætning w-24, handlinger ~ 4 × 32px = 128px). */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="w-20 text-right">Aftaler</span>
                <span className="w-24 text-right">Omsætning</span>
                <span className="w-[136px] text-right pr-2">Handlinger</span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((c) => {
                const typeLabel = c.type === "business" ? "Erhverv" : c.type === "private" ? "Privat" : null;
                const typeDot = c.type === "business" ? "bg-blue-500" : c.type === "private" ? "bg-emerald-500" : "bg-muted-foreground/40";
                const displayName = c.type === "business" && c.company_name ? c.company_name : c.name;
                const metaParts: string[] = [];
                if (c.last_order_at) metaParts.push(`Sidste aftale: ${fmtDate(c.last_order_at)}`);
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
                      <Checkbox
                        checked={selectedIds.has(customerKey(c))}
                        onCheckedChange={() => toggleSelect(customerKey(c))}
                        aria-label={`Vælg ${c.name}`}
                      />
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
                           loading="lazy" decoding="async"/>
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                            {c.type === "business"
                              ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                        {typeLabel && (
                          <span
                            title={c.type === "business" ? "Erhvervskunde (firma med CVR)" : "Privatkunde"}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground shrink-0"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${typeDot}`} />
                            {typeLabel}
                          </span>
                        )}
                        <CustomerStatusPill c={c} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {metaParts.join(" · ") || "Ingen aftaler endnu"}
                      </div>
                      {/* Aggregeret regnskabsstatus: viser fx "1 forfalden · 1 rykker · 3 betalt" */}
                      {c.accounting_summary && (
                        <div className="mt-1.5">
                          <CustomerOrderStatusSummary summary={c.accounting_summary} />
                        </div>
                      )}
                    </button>

                    {/* Aftaler */}
                    <div className="hidden sm:block w-20 text-right text-sm tabular-nums text-foreground">
                      {c.orders_count > 0 ? c.orders_count : <span className="text-muted-foreground">—</span>}
                    </div>

                    {/* Omsætning */}
                    <div className="hidden sm:block w-24 text-right text-sm font-semibold tabular-nums text-foreground">
                      {c.total_revenue > 0 ? fmtKr(c.total_revenue) : <span className="font-normal text-muted-foreground">—</span>}
                    </div>

                    {/* Handlinger */}
                    {/* Inline handlings-knapper — synlige for hver kunde, så ingen
                        dropdown er nødvendig. Tooltips forklarer hver handling. */}
                    <div className="flex items-center justify-end gap-0.5 shrink-0 sm:w-[136px]" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedEmail(c.email)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            aria-label="Se detaljer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Se detaljer</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => openCreateOrderForCustomer(c)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            aria-label="Opret aftale"
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Opret aftale</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => openEditDialog(c)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            aria-label="Rediger kunde"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Rediger kunde</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ open: true, targets: [c] })}
                            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label="Slet kunde"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {c.saved_id ? "Slet kunde" : "Slet kunde og alle aftaler"}
                        </TooltipContent>
                      </Tooltip>
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
              {confirmDelete && confirmDelete.targets.length === 1
                ? "Kunden slettes helt — både fra dit kartotek og alle deres aftaler og abonnementer hos dig. Handlingen kan ikke fortrydes."
                : `Kunderne slettes helt — både fra dit kartotek og alle deres aftaler og abonnementer hos dig. Handlingen kan ikke fortrydes.`}
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
  const orders = data?.orders ?? [];
  const liveOrders = orders.filter(o => !["cancelled", "rejected"].includes(o.status));
  const activeOrders = liveOrders.filter(o => ["pending", "confirmed", "in_progress"].includes(o.status));
  const paymentIssueCount = orders.filter(o => {
    if (["cancelled", "rejected"].includes(o.status)) return false;
    return o.payment_status === "overdue" || Number(o.reminder_count ?? 0) > 0;
  }).length;
  const nextOrder = [...liveOrders].sort((a, b) => {
    const priority = (o: OrderRow) => {
      if (o.payment_status === "overdue" || Number(o.reminder_count ?? 0) > 0) return 0;
      if (o.status === "pending") return 1;
      if (o.status === "confirmed" || o.status === "in_progress") return 2;
      if (o.preferred_date) return 3;
      return 4;
    };
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return (a.preferred_date || a.created_at).localeCompare(b.preferred_date || b.created_at);
  })[0];
  const sortedOrders = [...orders].sort((a, b) => {
    const score = (o: OrderRow) => {
      if (o.payment_status === "overdue" || Number(o.reminder_count ?? 0) > 0) return 0;
      if (o.status === "pending") return 1;
      if (o.status === "confirmed" || o.status === "in_progress") return 2;
      if (o.status === "completed") return 3;
      return 4;
    };
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <Sheet open={!!email} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {customer && (
          <>
            {/* Header — pr-10 giver plads til Sheet's indbyggede X-knap så den ikke overlapper indhold */}
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background p-3 pr-12">
              <SheetTitle className="text-left">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-base font-bold text-foreground">{customer.name}</h3>
                    <CustomerStatusPill c={customer} />
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-normal text-muted-foreground">
                    <span>{activeOrders.length > 0 ? `${activeOrders.length} aktive aftaler` : customer.first_order_at ? `Kunde siden ${fmtDate(customer.first_order_at)}` : "Ingen aftaler endnu"}</span>
                    {paymentIssueCount > 0 && <span className="font-medium text-destructive">{paymentIssueCount} kræver betaling</span>}
                    {customer.total_revenue > 0 && <span>Omsætning {fmtKr(customer.total_revenue)}</span>}
                  </div>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5">
                <a href={`mailto:${customer.email}`}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-foreground hover:bg-secondary/60 max-w-full">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </a>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-foreground hover:bg-secondary/60">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </a>
                )}
                {(customer.address || customer.city) && (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-foreground max-w-full">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {[customer.address, [customer.zip_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                    </span>
                  </span>
                )}
              </div>

              {isLoading ? (
                <DialogDetailsSkeleton sections={2} />
              ) : (
                <>
                  {nextOrder && (
                    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fokus nu</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                            {nextOrder.order_items?.[0]?.service_name || "Aftale"}
                            {nextOrder.order_items?.length > 1 ? ` +${nextOrder.order_items.length - 1}` : ""}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={nextOrder.status} />
                            <AccountingStatusRow order={nextOrder as OrderForStatus} size="xs" />
                            {nextOrder.preferred_date && (
                              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-card px-1.5 text-[10px] text-foreground">
                                <Calendar className="h-2.5 w-2.5" /> {fmtDate(nextOrder.preferred_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{fmtKr(nextOrder.total_amount)}</span>
                      </div>
                    </div>
                  )}

                  {customer.accounting_summary && (customer.accounting_summary.overdue > 0 || customer.accounting_summary.reminders > 0 || customer.accounting_summary.unpaid > 0) && (
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      <CustomerOrderStatusSummary summary={customer.accounting_summary} />
                    </div>
                  )}

                  {/* Orders — vigtigste først */}
                  {sortedOrders.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Package className="h-3.5 w-3.5" /> Aftaler ({sortedOrders.length})
                      </h4>
                      <div className="space-y-1.5">
                        {sortedOrders.map(o => {
                          const serviceNames = (o.order_items || []).map(it => it.service_name).filter(Boolean);
                          const serviceLabel = serviceNames.length > 0
                            ? serviceNames.slice(0, 2).join(", ") + (serviceNames.length > 2 ? ` +${serviceNames.length - 2}` : "")
                            : "Aftale";
                          return (
                            <div key={o.id} className="rounded-lg border border-border bg-card px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <p className="truncate text-sm font-semibold text-foreground">{serviceLabel}</p>
                                    {o.is_paused
                                      ? <Badge variant="outline" className="h-5 border-warning/40 bg-warning/10 px-1.5 text-[10px] text-warning-foreground">På pause</Badge>
                                      : <StatusBadge status={o.status} />}
                                    <AccountingStatusRow order={o as OrderForStatus} size="xs" />
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {format(parseISO(o.created_at), "d. MMM yyyy", { locale: da })}</span>
                                    {o.preferred_date && <span className="inline-flex items-center gap-1 text-accent"><Calendar className="h-3 w-3" /> Ønsket {fmtDate(o.preferred_date)}</span>}
                                    {(o.address || o.city) && <span className="truncate">{[o.address, [o.zip_code, o.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}
                                  </div>
                                </div>
                                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{fmtKr(o.total_amount)}</span>
                              </div>
                              {o.notes && <p className="mt-1.5 rounded bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground">📝 {o.notes}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Subscriptions — split active vs paused */}
                  {data && data.subscriptions.length > 0 && (() => {
                    const activeSubs = data.subscriptions.filter(s => s.status === "active");
                    const pausedSubs = data.subscriptions.filter(s => s.status === "paused");
                    const cancelledSubs = data.subscriptions.filter(s => s.status === "cancelled");
                    const renderSub = (s: SubRow) => {
                      const pref = s.preferred_route_id ? data.preferredRoutes[s.preferred_route_id] : null;
                      return (
                        <div key={s.id} className="rounded-lg border border-border bg-card px-3 py-2">
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
                      <div className="space-y-3">
                        {activeSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Repeat className="h-3.5 w-3.5" /> Aktive abonnementer ({activeSubs.length})
                            </h4>
                            <div className="space-y-1.5">{activeSubs.map(renderSub)}</div>
                          </div>
                        )}
                        {pausedSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                              <Pause className="h-3.5 w-3.5" /> På pause ({pausedSubs.length})
                            </h4>
                            <div className="space-y-1.5">{pausedSubs.map(renderSub)}</div>
                          </div>
                        )}
                        {cancelledSubs.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Repeat className="h-3.5 w-3.5" /> Opsagte ({cancelledSubs.length})
                            </h4>
                            <div className="space-y-1.5 opacity-60">{cancelledSubs.map(renderSub)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {data && data.stops.length > 0 && (
                    <details className="group rounded-lg border border-border bg-card/60 px-3 py-2 text-xs">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 list-none font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5"><RouteIcon className="h-3.5 w-3.5 text-muted-foreground" /> Rutehistorik ({data.stops.length})</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {data.stops
                          .sort((a, b) => (b.routes?.route_date || "").localeCompare(a.routes?.route_date || ""))
                          .slice(0, 8)
                          .map(s => (
                            <Link
                              key={s.id}
                              to={`/virksomhed/ruter?date=${s.routes?.route_date}`}
                              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:border-accent/40"
                            >
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-foreground">
                                  {s.routes?.route_date ? format(parseISO(s.routes.route_date), "d. MMM yyyy", { locale: da }) : "—"}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">{s.routes?.name || "Rute"}</p>
                              </div>
                              <StatusBadge status={s.status} />
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                          ))}
                      </div>
                    </details>
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
