import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMySubscriptions, useUpdateSubscription, useMyProfile, useUpdateProfile,
  useCreateReview, useMyOrders,
} from "@/hooks/useDatabase";
import { useMyFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";
import { useQueryClient } from "@tanstack/react-query";
import {
  Package, User, Star, LogOut, Pause, Play, XCircle,
  CalendarClock, ArrowLeft, ExternalLink, ShieldCheck, Settings,
  Store, ChevronRight, Sparkles, ShoppingCart, Check, X,
  Clock, AlertTriangle, CheckCircle2, MessageSquare, FileText,
  Bell, Mail, Shield, KeyRound, Heart, Building2, MapPin, Trash2,
} from "lucide-react";
import SEO from "@/components/SEO";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Afventer godkendelse", variant: "outline" },
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "På pause", variant: "secondary" },
  cancelled: { label: "Opsagt", variant: "destructive" },
};

const ORDER_STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Afventer", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  confirmed: { label: "Godkendt", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  in_progress: { label: "I gang", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  completed: { label: "Afsluttet", color: "bg-secondary text-foreground border-border", icon: CheckCircle2 },
  cancelled: { label: "Annulleret", color: "bg-destructive/5 text-destructive border-destructive/20", icon: XCircle },
};

const CustomerDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"orders" | "subscriptions" | "favorites" | "profile">("orders");

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-muted-foreground">Indlæser dit panel...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/log-ind" replace />;

  const tabs = [
    { key: "orders" as const, label: "Bestillinger", icon: ShoppingCart },
    { key: "subscriptions" as const, label: "Abonnementer", icon: Package },
    { key: "favorites" as const, label: "Favoritter", icon: Heart },
    { key: "profile" as const, label: "Min profil", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Mit kundepanel – Serviceydere"
        description="Administrer dine bestillinger, abonnementer og favoritter på Serviceydere."
        canonicalPath="/min-konto"
        noIndex
      />
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
            </Link>
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            <span className="hidden text-sm font-medium text-foreground sm:inline">Kundepanel</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {(user.email || "U").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log ud</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                Velkommen, {user.email?.split("@")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">Administrer dine bestillinger og services</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8 sm:flex sm:gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                tab === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="pb-12">
          {tab === "orders" && <OrdersView />}
          {tab === "subscriptions" && <SubscriptionsView />}
          {tab === "favorites" && <FavoritesView />}
          {tab === "profile" && <ProfileView />}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Favorites View                                  */
/* ════════════════════════════════════════════════ */
const FavoritesView = () => {
  const { data: favorites, isLoading } = useMyFavorites();
  const toggle = useToggleFavorite();

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-secondary/50" />)}
    </div>
  );

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Heart className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ingen favoritter endnu</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Klik på hjertet på en virksomhed for at gemme den her.
        </p>
        <div className="mt-5">
          <Link to="/virksomheder">
            <Button variant="outline" className="gap-2 rounded-xl"><Store className="h-4 w-4" /> Find virksomheder</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((fav: any) => {
        const biz = fav.businesses;
        if (!biz) return null;
        const cats: string[] = Array.isArray(biz.categories) && biz.categories.length > 0
          ? biz.categories
          : biz.category ? [biz.category] : [];
        const primaryCat = cats[0];

        return (
          <Link key={fav.id} to={`/v/${biz.slug}`} className="group flex flex-col gap-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary">
              {biz.cover_image_url ? (
                <img src={biz.cover_image_url} alt={biz.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                  <Building2 className="h-14 w-14 text-muted-foreground/30" />
                </div>
              )}

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle.mutate({ businessId: biz.id, isFavorited: true }); }}
                disabled={toggle.isPending}
                className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-card active:scale-95"
                aria-label="Fjern fra favoritter"
              >
                <Trash2 className="h-3.5 w-3.5" /> Fjern
              </button>

              {biz.is_verified && (
                <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                  <ShieldCheck className="h-3 w-3 text-accent" /> Verificeret
                </div>
              )}

              {biz.logo_url && (
                <div className="absolute -bottom-5 left-4 h-14 w-14 overflow-hidden rounded-xl border-2 border-card bg-card shadow-md flex items-center justify-center">
                  <img src={biz.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
                </div>
              )}
            </div>

            <div className={`flex flex-col gap-1 px-1 ${biz.logo_url ? "pt-4" : ""}`}>
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground line-clamp-1">{biz.name}</h3>
              {primaryCat && (
                <span className="inline-flex w-fit items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {primaryCat}
                </span>
              )}
              {biz.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{biz.city}</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Orders View — shows proposals, accepts/rejects  */
/* ════════════════════════════════════════════════ */
const OrdersView = () => {
  const { data: orders, isLoading } = useMyOrders();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />)}
    </div>
  );

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
          <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ingen bestillinger endnu</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Bestil en service hos en virksomhed, og den dukker automatisk op her.
        </p>
        <div className="mt-5 flex gap-3">
          <Link to="/virksomheder">
            <Button variant="outline" className="gap-2 rounded-xl"><Store className="h-4 w-4" /> Find virksomheder</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Count proposals needing attention
  const proposalCount = orders.filter(o => o.business_response === "adjusted" && !o.customer_response).length;

  const filteredOrders = filter === "all" ? orders
    : filter === "proposals" ? orders.filter(o => o.business_response === "adjusted" && !o.customer_response)
    : orders.filter(o => o.status === filter);

  const handleCustomerResponse = async (orderId: string, response: "accepted" | "rejected", order: any) => {
    try {
      const { error } = await supabase.from("orders").update({
        customer_response: response,
        status: response === "accepted" ? ("confirmed" as const) : ("pending" as const),
        total_amount: response === "accepted" ? (order.adjusted_amount || order.total_amount) : order.total_amount,
      }).eq("id", orderId);
      if (error) throw error;

      // Aktivér eller annullér tilknyttede abonnementer på baggrund af kundens svar på tilpasset forslag
      if (response === "accepted") {
        await supabase.from("subscriptions")
          .update({ status: "active" })
          .eq("order_id", orderId)
          .eq("status", "pending");
      } else {
        await supabase.from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .in("status", ["pending", "active"]);
      }

      toast.success(response === "accepted" ? "Du har godkendt forslaget!" : "Du har afvist forslaget. Virksomheden vil modtage besked.");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Proposal alert */}
      {proposalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {proposalCount} {proposalCount === 1 ? "forslag" : "forslag"} fra virksomheder afventer dit svar
            </p>
            <p className="text-xs text-amber-700">Gennemgå og godkend eller afvis de tilpassede aftaler</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFilter("proposals")}
            className="ml-auto shrink-0 rounded-xl text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
            Se forslag
          </Button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {[
          { key: "all", label: "Alle" },
          ...(proposalCount > 0 ? [{ key: "proposals", label: `Forslag (${proposalCount})` }] : []),
          { key: "pending", label: "Afventer" },
          { key: "confirmed", label: "Godkendt" },
          { key: "completed", label: "Afsluttet" },
          { key: "cancelled", label: "Annulleret" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:rounded-t"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} onRespond={handleCustomerResponse} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Ingen bestillinger i denne kategori</p>
        </div>
      )}
    </div>
  );
};

/* ── Order Card ── */
const OrderCard = ({ order, onRespond }: {
  order: any;
  onRespond: (orderId: string, response: "accepted" | "rejected", order: any) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
  const biz = order.businesses || {};
  const items = order.order_items || [];
  const hasProposal = order.business_response === "adjusted" && !order.customer_response;
  const customerAccepted = order.customer_response === "accepted";
  const customerRejected = order.customer_response === "rejected";

  return (
    <Card className={`rounded-2xl overflow-hidden transition-all ${
      hasProposal ? "border-amber-200 shadow-md ring-1 ring-amber-100" : "border-border"
    }`}>
      <CardContent className="p-0">
        {/* Proposal banner */}
        {hasProposal && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 border-b border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-800">Virksomheden har sendt et tilpasset forslag</span>
          </div>
        )}

        {/* Header */}
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 py-3.5 hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {biz.logo_url ? (
                <img src={biz.logo_url} alt="" className="h-9 w-9 rounded-lg border border-border object-contain bg-card p-0.5 shrink-0" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary border border-border shrink-0">
                  <Store className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{biz.name || "Virksomhed"}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                  {items.length > 0 && ` · ${items.length} ${items.length === 1 ? "service" : "services"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">
                  {hasProposal ? order.adjusted_amount : order.total_amount} kr
                </span>
                {hasProposal && order.adjusted_amount !== order.total_amount && (
                  <span className="block text-[11px] text-muted-foreground line-through">{order.total_amount} kr</span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-border bg-muted/5 px-4 py-4 space-y-4">
            {/* Original order items */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Din bestilling</span>
              </div>
              {items.map((item: any) => (
                <div key={item.id} className="border-b border-border last:border-b-0 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground">{item.service_name}</span>
                      {item.details?.interval && item.details.interval !== "engangskøb" && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          {INTERVAL_LABELS[item.details.interval] || item.details.interval}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">{item.total_price} kr</span>
                  </div>
                  {item.details?.stepDetails && (
                    <div className="mt-2 space-y-1">
                      {(item.details.stepDetails as any[]).map((sd: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>{sd.label}: <span className="font-medium text-foreground/80">{sd.value} {sd.unit}</span></span>
                          <span className="font-medium text-foreground/70">{sd.subtotal} kr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="px-4 py-2.5 flex justify-between bg-muted/30">
                <span className="text-sm font-bold text-foreground">I alt</span>
                <span className="text-sm font-bold text-foreground">{order.total_amount} kr</span>
              </div>
            </div>

            {/* Business message */}
            {order.business_message && (
              <div className="rounded-xl bg-secondary/30 border border-border px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Besked fra virksomheden</span>
                </div>
                <p className="text-sm text-foreground">{order.business_message}</p>
              </div>
            )}

            {/* Proposal section */}
            {order.business_response === "adjusted" && order.adjusted_details && (
              <div className={`rounded-xl border overflow-hidden ${
                hasProposal ? "border-amber-200" : customerAccepted ? "border-green-200" : "border-destructive/20"
              }`}>
                <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${
                  hasProposal ? "bg-amber-50 border-amber-200" : customerAccepted ? "bg-green-50 border-green-200" : "bg-destructive/5 border-destructive/20"
                }`}>
                  {hasProposal ? (
                    <><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /><span className="text-xs font-semibold text-amber-800">Tilpasset forslag fra virksomheden</span></>
                  ) : customerAccepted ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span className="text-xs font-semibold text-green-800">Du godkendte dette forslag</span></>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs font-semibold text-destructive">Du afviste dette forslag</span></>
                  )}
                </div>
                {((order.adjusted_details as any)?.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="border-b border-border/50 last:border-b-0 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">{item.service_name}</span>
                        {item.details?.interval && item.details.interval !== "engangskøb" && (
                          <span className="ml-2 text-[11px] text-accent">{INTERVAL_LABELS[item.details.interval] || item.details.interval}</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.total_price} kr</span>
                    </div>
                    {item.details?.stepDetails?.map((sd: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground mt-0.5 pl-0.5">
                        <span>{sd.label}: {sd.value} {sd.unit}</span>
                        <span>{sd.subtotal} kr</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className={`px-4 py-2.5 flex justify-between ${
                  hasProposal ? "bg-amber-50" : customerAccepted ? "bg-green-50" : "bg-destructive/5"
                }`}>
                  <span className="text-sm font-bold text-foreground">Tilpasset pris</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{order.adjusted_amount} kr</span>
                    {order.adjusted_amount !== order.total_amount && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">{order.total_amount} kr</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Accept/reject button for proposals */}
            {hasProposal && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => onRespond(order.id, "accepted", order)}
                  className="gap-1.5 rounded-xl text-xs bg-green-600 text-white hover:bg-green-700 shadow-sm">
                  <Check className="h-3.5 w-3.5" /> Godkend forslag ({order.adjusted_amount} kr)
                </Button>
                <Button variant="outline" size="sm" onClick={() => onRespond(order.id, "rejected", order)}
                  className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                  <X className="h-3.5 w-3.5" /> Afvis forslag
                </Button>
              </div>
            )}

            {/* Status messages for non-proposal states */}
            {order.business_response === "accepted" && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-800 font-medium">Virksomheden har godkendt din bestilling</span>
              </div>
            )}
            {order.business_response === "rejected" && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive font-medium">Virksomheden har desværre afvist din bestilling</span>
              </div>
            )}

            {/* Link to business */}
            {biz.slug && (
              <Link to={`/b/${biz.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                Se virksomhedens side <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ════════════════════════════════════════════════ */
/*  Subscriptions View                              */
/* ════════════════════════════════════════════════ */
const SubscriptionsView = () => {
  const { data: subscriptions, isLoading } = useMySubscriptions();
  const updateSub = useUpdateSubscription();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />)}
    </div>
  );

  const handlePause = (id: string) => {
    updateSub.mutate({ id, status: "paused", paused_at: new Date().toISOString() }, {
      onSuccess: () => toast.success("Service sat på pause"),
      onError: (e) => toast.error(e.message),
    });
  };
  const handleResume = (id: string) => {
    // Genoptag: planlæg næste besøg snarest (i morgen) så det igen dukker op i ruteplanlægning
    // — preferred_route_id på abonnementet huskes fra sidste gang og bruges til at foreslå samme rute
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateSub.mutate(
      { id, status: "active", paused_at: null, next_service_date: tomorrow.toISOString() },
      {
        onSuccess: () => toast.success("Service genoptaget — næste besøg planlægges snarest"),
        onError: (e) => toast.error(e.message),
      }
    );
  };
  const handleCancel = (id: string) => {
    if (!confirm("Er du sikker på, at du vil opsige denne service?")) return;
    updateSub.mutate({ id, status: "cancelled", cancelled_at: new Date().toISOString() }, {
      onSuccess: () => toast.success("Service opsagt"),
      onError: (e) => toast.error(e.message),
    });
  };

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Package className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ingen aktive abonnementer</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Bestil en tilbagevendende service, og dit abonnement vises her.
        </p>
      </div>
    );
  }

  const grouped: Record<string, { biz: any; subs: any[] }> = {};
  subscriptions.forEach((sub: any) => {
    const bizId = sub.business_id;
    if (!grouped[bizId]) grouped[bizId] = { biz: sub.businesses || {}, subs: [] };
    grouped[bizId].subs.push(sub);
  });

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([bizId, { biz, subs }]) => (
        <div key={bizId}>
          <div className="mb-4 flex items-center gap-3">
            {biz.logo_url ? (
              <img src={biz.logo_url} alt="" className="h-10 w-10 rounded-xl border border-border object-contain bg-card p-0.5" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{biz.name || "Virksomhed"}</h3>
              {biz.city && <p className="text-xs text-muted-foreground">{biz.city}</p>}
            </div>
            {biz.slug && (
              <Link to={`/b/${biz.slug}`}>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
                  Se side <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {subs.map((sub: any) => {
              const effectiveStatus = sub.status === "active" && sub.orders?.status === "pending"
                ? "pending"
                : sub.status;
              const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.active;
              return (
                <Card key={sub.id} className="overflow-hidden rounded-2xl border-border transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    <div className={`h-1 w-full ${
                      effectiveStatus === "active" ? "bg-accent"
                      : effectiveStatus === "paused" ? "bg-yellow-400"
                      : effectiveStatus === "pending" ? "bg-muted-foreground/30"
                      : "bg-destructive"
                    }`} />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground">{sub.service_name}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                            {sub.interval !== "engangskøb" && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3 w-3" />
                                {INTERVAL_LABELS[sub.interval] || sub.interval}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold text-foreground">{sub.total_price} kr</span>
                          {sub.interval !== "engangskøb" && (
                            <span className="block text-xs text-muted-foreground">
                              /{(INTERVAL_LABELS[sub.interval] || sub.interval).toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {sub.details && (sub.details as any).stepDetails && (
                        <div className="rounded-xl bg-secondary/40 overflow-hidden divide-y divide-border">
                          {((sub.details as any).stepDetails as any[]).map((sd: any, i: number) => (
                            <div key={i} className="flex justify-between px-3.5 py-2 text-xs">
                              <span className="text-muted-foreground">{sd.label}: {sd.value} {sd.unit}</span>
                              <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {effectiveStatus === "pending" && (
                          <p className="text-xs text-muted-foreground italic">
                            Afventer at virksomheden godkender din bestilling. Abonnementet aktiveres automatisk når den er godkendt.
                          </p>
                        )}
                        {effectiveStatus === "active" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handlePause(sub.id)}
                              className="gap-1.5 rounded-xl text-xs"><Pause className="h-3.5 w-3.5" /> Sæt på pause</Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)}
                              className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                              <XCircle className="h-3.5 w-3.5" /> Opsig</Button>
                            <Button variant="outline" size="sm"
                              onClick={() => setReviewingId(reviewingId === sub.id ? null : sub.id)}
                              className="gap-1.5 rounded-xl text-xs ml-auto"><Star className="h-3.5 w-3.5" /> Anmeld</Button>
                          </>
                        )}
                        {effectiveStatus === "paused" && (
                          <>
                            <Button size="sm" onClick={() => handleResume(sub.id)}
                              className="gap-1.5 rounded-xl text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                              <Play className="h-3.5 w-3.5" /> Genoptag</Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancel(sub.id)}
                              className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                              <XCircle className="h-3.5 w-3.5" /> Opsig</Button>
                          </>
                        )}
                        {effectiveStatus === "cancelled" && (
                          <p className="text-xs text-muted-foreground italic">
                            Opsagt {sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString("da-DK") : ""}
                          </p>
                        )}
                      </div>

                      {reviewingId === sub.id && (
                        <ReviewForm businessId={sub.business_id} subscriptionId={sub.id} onDone={() => setReviewingId(null)} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Review Form                                     */
/* ════════════════════════════════════════════════ */
const ReviewForm = ({ businessId, subscriptionId, onDone }: { businessId: string; subscriptionId: string; onDone: () => void }) => {
  const { user } = useAuth();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = () => {
    createReview.mutate({
      business_id: businessId,
      reviewer_name: user?.email?.split("@")[0] || "Kunde",
      rating, comment: comment.trim() || null,
      customer_id: user?.id, subscription_id: subscriptionId,
    }, {
      onSuccess: () => { toast.success("Anmeldelse sendt!"); onDone(); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Star className="h-4 w-4 text-accent" /> Skriv en anmeldelse
      </h4>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Din bedømmelse</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} onMouseEnter={() => setHoveredStar(i)} onMouseLeave={() => setHoveredStar(0)} type="button" className="transition-transform hover:scale-110">
              <Star className={`h-7 w-7 transition-colors ${i <= (hoveredStar || rating) ? "fill-accent text-accent" : "text-border"}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Kommentar (valgfrit)</label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Fortæl om din oplevelse..." rows={3} className="bg-card" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={createReview.isPending}
          className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
          {createReview.isPending ? "Sender..." : "Send anmeldelse"}
        </Button>
        <Button variant="outline" size="sm" onClick={onDone} className="rounded-xl">Annuller</Button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/*  Profile & Settings View                         */
/* ════════════════════════════════════════════════ */
const ProfileView = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "notifications" | "account">("profile");
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    email_order_status: true,
    email_proposal: true,
    email_subscription: true,
    email_upcoming_service: false,
    email_marketing: false,
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary/50" />;

  if (profile && !initialized) {
    setDisplayName(profile.display_name || "");
    setPhone(profile.phone || "");
    const saved = (profile as any).notification_settings as Record<string, boolean> | null;
    if (saved && typeof saved === "object") {
      setNotifSettings(prev => ({ ...prev, ...saved }));
    }
    setInitialized(true);
  }

  const handleSave = () => {
    if (!user) return;
    updateProfile.mutate({
      userId: user.id,
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      notification_settings: notifSettings,
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt!"),
      onError: (e) => toast.error(e.message),
    });
  };

  const settingsTabs = [
    { key: "profile" as const, label: "Profil", icon: User },
    { key: "notifications" as const, label: "Notifikationer", icon: Bell },
    { key: "account" as const, label: "Konto", icon: Shield },
  ];

  const NOTIF_OPTIONS = [
    { key: "email_order_status", label: "Ordrestatus", desc: "Få besked når din ordre ændrer status (godkendt, i gang, udført)", icon: ShoppingCart },
    { key: "email_proposal", label: "Forslag fra virksomheder", desc: "Få besked når en virksomhed sender et tilpasset prisforslag", icon: MessageSquare },
    { key: "email_subscription", label: "Abonnementsændringer", desc: "Bekræftelse når du ændrer, pauser eller opsiger et abonnement", icon: Package },
    { key: "email_upcoming_service", label: "Kommende services", desc: "Påmindelse inden en planlagt service skal udføres", icon: CalendarClock },
    { key: "email_marketing", label: "Nyheder & tilbud", desc: "Hold dig opdateret med nyheder, tips og tilbud fra Serviceydere", icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Settings tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {settingsTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSettingsTab(key)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              settingsTab === key
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {settingsTab === "profile" && (
        <div className="max-w-lg space-y-6">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <User className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{displayName || user?.email?.split("@")[0] || "Bruger"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Visningsnavn</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Dit navn" className="bg-card" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefon</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="12 34 56 78" className="bg-card" type="tel" />
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateProfile.isPending}
                className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
                {updateProfile.isPending ? "Gemmer..." : "Gem ændringer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications tab */}
      {settingsTab === "notifications" && (
        <div className="max-w-lg space-y-6">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email-notifikationer
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Vælg hvilke emails du vil modtage fra Serviceydere.</p>
              </div>
              <div className="space-y-3">
                {NOTIF_OPTIONS.map(({ key, label, desc, icon: Icon }) => (
                  <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative mt-1 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                        notifSettings[key] ? "bg-accent" : "bg-border"
                      }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
                        notifSettings[key] ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
              <Button onClick={handleSave} disabled={updateProfile.isPending}
                className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
                {updateProfile.isPending ? "Gemmer..." : "Gem notifikationsindstillinger"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account tab */}
      {settingsTab === "account" && (
        <div className="max-w-lg space-y-6">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  Kontooplysninger
                </h3>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Din email bruges til login og kommunikation.</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adgangskode</label>
                  <p className="text-xs text-muted-foreground">Du kan nulstille din adgangskode via email.</p>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs"
                    onClick={async () => {
                      if (!user?.email) return;
                      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                      if (error) toast.error(error.message);
                      else toast.success("Vi har sendt dig en email til at nulstille din adgangskode.");
                    }}>
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Nulstil adgangskode
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-destructive">Farezone</h4>
                <p className="text-xs text-muted-foreground">
                  Når du logger ud, kan du altid logge ind igen med din email og adgangskode.
                </p>
                <Button variant="outline" size="sm" onClick={signOut}
                  className="rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log ud
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
