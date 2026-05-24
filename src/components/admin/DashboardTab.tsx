import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Handshake, DollarSign, Star, Briefcase, TrendingUp,
  ArrowRight, AlertCircle, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2,
  Share2, Eye, Calendar, MessageSquare, Link2, Check,
  Zap, Target, Settings as SettingsIcon, Users,
  Search, X, Inbox, Rocket, PartyPopper, ArrowUpDown,
  HelpCircle, Wallet, FileText, AlertTriangle, ReceiptText,
} from "lucide-react";
import type { Business } from "@/hooks/useDatabase";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";

interface Props {
  business: Business;
  ordersCount: number;
  revenue: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  pendingOrders: number;
  recentOrders: any[];
  reviews?: any[];
  services?: any[];
  onNavigate?: (tab: string) => void;
}

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
// Dansk: vis altid fuldt tal med tusindtals-punktum (3.700) — ingen "k"-forkortelse,
// da det ikke giver mening på dansk. For meget store beløb (>= 1 mio) bruger vi
// "mio" som dansk forkortelse for million.
const fmtKrShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mio`;
  return Math.round(n).toLocaleString("da-DK");
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Godnat";
  if (h < 10) return "Godmorgen";
  if (h < 13) return "God formiddag";
  if (h < 17) return "God eftermiddag";
  if (h < 22) return "Godaften";
  return "Godnat";
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DashboardTab = ({
  business, ordersCount, revenue, servicesCount, averageRating, reviewsCount,
  pendingOrders, recentOrders, reviews, services, onNavigate,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const openGuide = () => {
    const params = new URLSearchParams(location.search);
    params.set("guide", "1");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };
  // Hurtig inline status til "Se guide"-knappen — viser brugeren hvor langt
  // de er kommet uden at åbne popuppen. Bruger samme signaler som
  // OnboardingHub auto-detekterer på (men kun det vi har lokalt).
  const guideSignals = useMemo(() => {
    const settings = (business as any)?.settings || {};
    const categories = (business as any)?.categories || [];
    const accountingEnabled = !!settings.accounting_integration_enabled;
    const checks = [
      categories.length > 0,                          // 1 brancher
      !accountingEnabled,                             // 2 regnskab (antaget OK hvis ikke aktiveret)
      false,                                          // 3 medarbejder — kan ikke detekteres her, OnboardingHub henter
      servicesCount > 0,                              // 4 services
      ordersCount > 0,                                // 5 bestilling
      false,                                          // 6 rute — hentes i hub
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: 6 };
  }, [business, servicesCount, ordersCount]);
  // Stat-detalje-panel — hvilken metric vi har åbnet, hvis nogen.
  const [openStat, setOpenStat] = useState<null | "revenue" | "orders" | "today" | "pending" | "rating">(null);
  // Filtre på "Seneste bestillinger" — status-pille + søgetekst.
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "status">("newest");

  // ── Periode-aggregat: dag/uge/30-dage + sparkline-data ───────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const isRevenue = (o: any) => o.status !== "cancelled";
    const orderAmount = (o: any) => Number(o.total_amount) || 0;

    // Bucket pr. dag for de seneste 14 dage (idx 0 = ældste, 13 = i dag)
    const buckets14 = Array.from({ length: 14 }, () => ({ rev: 0, count: 0 }));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    (recentOrders || []).forEach((o: any) => {
      const t = +new Date(o.created_at);
      const dayIdx = 13 - Math.floor((+todayStart - new Date(t).setHours(0,0,0,0)) / DAY_MS);
      if (dayIdx >= 0 && dayIdx <= 13) {
        buckets14[dayIdx].count++;
        if (isRevenue(o)) buckets14[dayIdx].rev += orderAmount(o);
      }
    });

    const sum = (arr: { rev: number; count: number }[], from: number, to: number) =>
      arr.slice(from, to).reduce((acc, b) => ({ rev: acc.rev + b.rev, count: acc.count + b.count }), { rev: 0, count: 0 });

    const last7 = sum(buckets14, 7, 14);
    const prev7 = sum(buckets14, 0, 7);

    // 30-dages perioder
    const cutNow = now - 30 * DAY_MS;
    const cutPrev = now - 60 * DAY_MS;
    const cur30 = (recentOrders || []).filter((o) => +new Date(o.created_at) >= cutNow);
    const prev30 = (recentOrders || []).filter((o) => {
      const t = +new Date(o.created_at);
      return t >= cutPrev && t < cutNow;
    });
    const sumRev = (xs: any[]) => xs.filter(isRevenue).reduce((s, o) => s + orderAmount(o), 0);

    const tomorrowStart = +todayStart + DAY_MS;
    const todayOrders = (recentOrders || []).filter((o) => {
      const t = +new Date(o.created_at);
      return t >= +todayStart && t < tomorrowStart;
    });

    return {
      buckets14,
      revenue7: last7.rev, revenuePrev7: prev7.rev,
      orders7: last7.count, ordersPrev7: prev7.count,
      revenue30: sumRev(cur30), revenuePrev30: sumRev(prev30),
      orders30: cur30.length, ordersPrev30: prev30.length,
      todayCount: todayOrders.length,
      todayRevenue: sumRev(todayOrders),
    };
  }, [recentOrders]);

  const trend = (current: number, prev: number) => {
    if (prev === 0 && current === 0) return { pct: 0, dir: "flat" as const };
    if (prev === 0) return { pct: 100, dir: "up" as const };
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct: Math.abs(pct), dir: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "flat" as const };
  };
  const revTrend = trend(stats.revenue7, stats.revenuePrev7);
  const ordTrend = trend(stats.orders7, stats.ordersPrev7);

  // ── Finansielt overblik: hvad er faktureret, betalt, udestående —
  //    samt hvad der skal udbetales til medarbejdere baseret på udførte
  //    aftaler i `employee_completed_stops`. Bruger samme periode-vinduer
  //    (7 dage / 30 dage) som de øvrige snapshots. Default-perioden styres
  //    af brugeren via FinanceOverviewCard's lille toggle.
  const { data: employeeEarnings } = useQuery({
    queryKey: ["dashboard-employee-earnings", business.id],
    enabled: !!business.id,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
      const { data, error } = await supabase
        .from("employee_completed_stops")
        .select("earnings, completed_at, employee_id")
        .eq("business_id", business.id)
        .gte("completed_at", since);
      if (error) throw error;
      return data || [];
    },
  });

  const finance = useMemo(() => {
    const now = Date.now();
    const cut7 = now - 7 * DAY_MS;
    const cut30 = now - 30 * DAY_MS;
    // En aftale tæller med i finans-overblikket hvis den er faktisk værdi —
    // dvs. ikke annulleret, ikke krediteret og ikke void'et.
    const isLive = (o: any) =>
      o.status !== "cancelled" && o.status !== "rejected" && !o.voided_at && !o.credited_at;
    const amount = (o: any) => Number(o.total_amount) || 0;

    const calc = (cut: number) => {
      const inPeriod = (recentOrders || []).filter(
        (o: any) => +new Date(o.created_at) >= cut,
      );
      const live = inPeriod.filter(isLive);
      const billed = live.reduce((s, o) => s + amount(o), 0);
      const paidOrders = live.filter(
        (o: any) => o.paid_at || o.payment_status === "paid",
      );
      const paid = paidOrders.reduce((s, o) => s + amount(o), 0);
      const overdueOrders = live.filter(
        (o: any) =>
          !o.paid_at &&
          o.payment_status !== "paid" &&
          (o.payment_status === "overdue" || (o.reminder_count ?? 0) > 0),
      );
      const overdue = overdueOrders.reduce((s, o) => s + amount(o), 0);
      const outstanding = Math.max(0, billed - paid);
      const completedOrders = live.filter((o: any) => o.status === "completed");
      const completedSum = completedOrders.reduce((s, o) => s + amount(o), 0);
      const notCompletedOrders = live.filter((o: any) => o.status !== "completed");
      const notCompletedSum = notCompletedOrders.reduce((s, o) => s + amount(o), 0);
      const cancelledOrders = inPeriod.filter(
        (o: any) => o.status === "cancelled" || o.status === "rejected",
      );
      const cancelled = cancelledOrders.reduce((s, o) => s + amount(o), 0);
      return {
        billed,
        paid,
        paidCount: paidOrders.length,
        outstanding,
        outstandingCount: live.filter(
          (o: any) => !o.paid_at && o.payment_status !== "paid",
        ).length,
        overdue,
        overdueCount: overdueOrders.length,
        completedSum,
        completedCount: completedOrders.length,
        notCompletedSum,
        notCompletedCount: notCompletedOrders.length,
        totalCount: live.length,
        cancelled,
        cancelledCount: cancelledOrders.length,
      };
    };

    const empPayout = (cut: number) =>
      (employeeEarnings || [])
        .filter((s: any) => +new Date(s.completed_at) >= cut)
        .reduce((sum: number, s: any) => sum + Number(s.earnings || 0), 0);

    const empUniqueCount = (cut: number) => {
      const ids = new Set<string>();
      (employeeEarnings || []).forEach((s: any) => {
        if (+new Date(s.completed_at) >= cut && s.employee_id) ids.add(s.employee_id);
      });
      return ids.size;
    };

    return {
      p7: { ...calc(cut7), employeePayout: empPayout(cut7), employeeCount: empUniqueCount(cut7) },
      p30: { ...calc(cut30), employeePayout: empPayout(cut30), employeeCount: empUniqueCount(cut30) },
    };
  }, [recentOrders, employeeEarnings]);

  // ── Nye anmeldelser sidste 7 dage ───────────────────────────────────
  const newReviews = useMemo(() => {
    if (!reviews) return 0;
    const cut = Date.now() - 7 * DAY_MS;
    return reviews.filter((r: any) => +new Date(r.created_at) >= cut).length;
  }, [reviews]);

  // ── Top services efter omsætning ────────────────────────────────────
  const topServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    services.forEach((s: any) => map.set(s.id, { name: s.name, revenue: 0, count: 0 }));
    (recentOrders || []).filter((o) => o.status !== "cancelled").forEach((o: any) => {
      const items = (o.order_items as any[]) || [];
      items.forEach((it) => {
        const entry = map.get(it.service_id);
        if (!entry) return;
        entry.revenue += Number(it.total_price ?? it.unit_price ?? 0);
        entry.count += Number(it.quantity ?? 1);
      });
    });
    return Array.from(map.values())
      .filter((s) => s.revenue > 0 || s.count > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [services, recentOrders]);
  const topRevenue = topServices[0]?.revenue || 0;

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
  };

  // ── Profilfuldendelse ───────────────────────────────────────────────
  const completeness = useMemo(() => {
    const checks = [
      { label: "Virksomhedsnavn", done: !!business.name },
      { label: "Beskrivelse", done: !!business.description },
      { label: "Logo", done: !!business.logo_url },
      { label: "Coverbillede", done: !!business.cover_image_url },
      { label: "Telefon", done: !!business.phone },
      { label: "Email", done: !!business.email },
      { label: "Adresse", done: !!business.address },
      { label: "By", done: !!business.city },
      { label: "Services tilføjet", done: servicesCount > 0 },
      { label: "Åbningstider", done: business.opening_hours && Object.keys(business.opening_hours as Record<string, unknown>).length > 0 },
    ];
    const doneCount = checks.filter(c => c.done).length;
    return { checks, doneCount, total: checks.length, pct: Math.round((doneCount / checks.length) * 100) };
  }, [business, servicesCount]);
  const missingItems = completeness.checks.filter(c => !c.done);

  // ── Auto-insight — én smart sætning baseret på state ────────────────
  const insight = (() => {
    if (servicesCount === 0) return "Tilføj din første service — det er det eneste, der mangler før kunder kan booke.";
    if (pendingOrders >= 3) return `${pendingOrders} bestillinger venter på svar — hver time tæller for konvertering.`;
    if (ordersCount === 0 && completeness.pct >= 70) return "Profilen er klar. Del jeres link for at få de første bestillinger.";
    if (revTrend.dir === "up" && stats.revenue7 > 0) return `Omsætningen er vokset ${revTrend.pct}% i denne uge — momentum er på jeres side.`;
    if (revTrend.dir === "down" && stats.revenuePrev7 > 0) return `Omsætningen er ${revTrend.pct}% under sidste uge — overvej at dele profilen eller justere priserne.`;
    if (reviewsCount === 0 && ordersCount > 0) return "I har afsluttede opgaver uden anmeldelser endnu — bed jeres glade kunder om en stjerne.";
    if (averageRating >= 4.5 && reviewsCount >= 3) return `${averageRating.toFixed(1)}★ over ${reviewsCount} anmeldelser — stærk profil. Vis den frem.`;
    return "Hold svartid lav og profilen opdateret — det er de to ting der flytter mest på konverteringen.";
  })();

  // ── Smart prioriteret handlingskø ───────────────────────────────────
  type Action = {
    key: string; label: string; meta: string; icon: React.ComponentType<{ className?: string }>;
    tab?: string; onClick?: () => void; priority: number; badge?: string; tone: "primary" | "accent" | "muted";
  };
  const shareUrl = business.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/v/${business.slug}` : "";
  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link kopieret");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Kunne ikke kopiere"); }
  };

  const actions: Action[] = [];
  if (pendingOrders > 0) actions.push({
    key: "pending", label: `Svar ${pendingOrders} afventende ${pendingOrders === 1 ? "bestilling" : "bestillinger"}`,
    meta: "Hurtigt svar fordobler konverteringen", icon: Zap, tab: "orders", priority: 100, badge: String(pendingOrders), tone: "primary",
  });
  if (servicesCount === 0) actions.push({
    key: "first-service", label: "Opret din første service",
    meta: "Kunder kan ikke booke uden services", icon: Briefcase, tab: "services", priority: 95, tone: "primary",
  });
  if (completeness.pct < 80) actions.push({
    key: "complete", label: "Fuldfør profil",
    meta: `${completeness.pct}% færdig · ${missingItems.length} ting tilbage`, icon: Target, tab: "settings", priority: 80, tone: "accent",
  });
  if (reviewsCount === 0 && ordersCount > 0) actions.push({
    key: "ask-review", label: "Bed kunder om anmeldelse",
    meta: "Anmeldelser hæver konvertering markant", icon: Star, tab: "reviews", priority: 70, tone: "accent",
  });
  if (newReviews > 0) actions.push({
    key: "new-reviews", label: `${newReviews} ${newReviews === 1 ? "ny anmeldelse" : "nye anmeldelser"}`,
    meta: "Kvittér og vis at I lytter", icon: MessageSquare, tab: "reviews", priority: 65, badge: String(newReviews), tone: "accent",
  });
  if (shareUrl) actions.push({
    key: "share", label: copied ? "Link kopieret" : "Del din profil",
    meta: "Kopiér linket til jeres offentlige profil", icon: copied ? Check : Link2, onClick: copyLink, priority: 50, tone: "muted",
  });
  actions.push({ key: "new-service", label: "Tilføj service", meta: "Udvid jeres tilbud", icon: Briefcase, tab: "services", priority: 30, tone: "muted" });
  actions.push({ key: "team", label: "Medarbejdere", meta: "Inviter dit team", icon: Users, tab: "employees", priority: 20, tone: "muted" });
  actions.push({ key: "settings", label: "Indstillinger", meta: "Profil, kontakt, åbningstider", icon: SettingsIcon, tab: "settings", priority: 10, tone: "muted" });
  actions.sort((a, b) => b.priority - a.priority);
  const primaryActions = actions.slice(0, 4);

  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:space-y-5">
      {/* ── Hero welcome panel — matcher forsidens hero (dark + cyan glows) ── */}
      <section
        className="relative isolate overflow-hidden rounded-xl px-3 py-3 text-background sm:rounded-2xl sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        style={{ backgroundColor: "hsl(var(--hero-bg))" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-[110px] opacity-25 animate-blob-slow"
            style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
          />
          <div
            className="absolute -bottom-32 right-[-10%] h-[26rem] w-[26rem] rounded-full blur-[100px] opacity-30"
            style={{ backgroundColor: "hsl(var(--hero-mid))" }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(ellipse 70% 60% at 75% 50%, hsl(var(--hero-mid) / 0.22), transparent 60%)" }}
          />
          <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-background/55 sm:text-xs sm:tracking-[0.2em]">
              {greeting()} · {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold leading-tight text-background sm:mt-1.5 sm:text-2xl lg:text-[2rem]">
              {business.name}
            </h1>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-background/78 sm:mt-1.5 sm:gap-2 sm:text-sm sm:leading-5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
              <span>{insight}</span>
            </p>
          </div>

          {business.slug && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:shrink-0">
              <button
                type="button" onClick={copyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--hero-bg))] transition-all hover:-translate-y-0.5 sm:px-3.5 sm:py-2 sm:text-xs"
                style={{ background: "linear-gradient(110deg, hsl(var(--hero-cyan)) 0%, hsl(var(--hero-cyan-bright)) 100%)" }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Kopieret" : "Del profil"}
              </button>
              <a
                href={`/v/${business.slug}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 py-1.5 text-[11px] font-semibold text-background backdrop-blur-sm transition-colors hover:bg-background/15 sm:px-3.5 sm:py-2 sm:text-xs"
              >
                <Eye className="h-3.5 w-3.5" /> Se din side
              </a>
              <button
                type="button"
                onClick={openGuide}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 py-1.5 text-[11px] font-semibold text-background backdrop-blur-sm transition-colors hover:bg-background/15 sm:px-3.5 sm:py-2 sm:text-xs"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Se guide
                <span className="tabular-nums opacity-80">· {guideSignals.done}/{guideSignals.total}</span>
              </button>
            </div>
          )}
        </div>

        {/* Snapshot-pille: i dag */}
        <div className="mt-2.5 grid min-w-0 grid-cols-2 gap-1.5 sm:mt-4 sm:grid-cols-4 sm:gap-2 lg:mt-6">
          <SnapshotPill label="I dag" value={String(stats.todayCount)} sub={`${fmtKrShort(stats.todayRevenue)} kr`} onClick={() => setOpenStat("today")} />
          <SnapshotPill label="Denne uge" value={String(stats.orders7)} sub={`${fmtKrShort(stats.revenue7)} kr`} onClick={() => setOpenStat("orders")} />
          <SnapshotPill label="Afventer" value={String(pendingOrders)} sub={pendingOrders > 0 ? "Skal besvares" : "Alt besvaret"} accent={pendingOrders > 0} onClick={() => setOpenStat("pending")} />
          <SnapshotPill label="Bedømmelse" value={reviewsCount > 0 ? `${averageRating.toFixed(1)}★` : "–"} sub={`${reviewsCount} ${reviewsCount === 1 ? "anmeldelse" : "anmeldelser"}`} onClick={reviewsCount > 0 ? () => onNavigate?.("reviews") : undefined} />
        </div>
      </section>

      <div className="grid w-full max-w-full min-w-0 items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="order-2 min-w-0 space-y-3 sm:space-y-4 xl:order-1">
          {/* Finansielt overblik — afløser de tidligere "Omsætning"-kort.
              Viser hvad der er faktureret, betalt, udestående/forfaldent,
              udført vs ikke-udført, og hvad der skal udbetales til
              medarbejdere baseret på udførte aftaler. */}
          <FinanceOverviewCard
            finance={finance}
            revTrend={revTrend}
            ordTrend={ordTrend}
            sparkline={stats.buckets14.map((b) => b.rev)}
            onOpenRevenue={() => setOpenStat("revenue")}
            onOpenOrders={() => setOpenStat("orders")}
            onNavigate={onNavigate}
          />

          {/* Seneste bestillinger */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <OrdersListSection
              recentOrders={recentOrders}
              servicesCount={servicesCount}
              completeness={completeness.pct}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              orderSearch={orderSearch}
              setOrderSearch={setOrderSearch}
              orderSort={orderSort}
              setOrderSort={setOrderSort}
              onNavigate={onNavigate}
              copyLink={copyLink}
              hasShareUrl={!!shareUrl}
              statusLabels={statusLabels}
              statusColors={statusColors}
            />
          </Card>

          {/* Top services */}
          {topServices.length > 0 ? (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Bedst sælgende services</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Det her tjener I mest på lige nu.</p>
                </div>
                <button onClick={() => onNavigate?.("services")} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Se alle <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {topServices.map((s, i) => {
                  const pct = topRevenue > 0 ? Math.max(6, Math.round((s.revenue / topRevenue) * 100)) : 0;
                  return (
                    <div key={s.name + i} className="px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-foreground">{i + 1}</span>
                          {s.name}
                        </p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{fmtKr(s.revenue)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--hero-mid)), hsl(var(--hero-cyan-bright)))" }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{s.count} stk solgt</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            servicesCount > 0 && ordersCount > 0 && (
              <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-foreground">Bedst sælgende services</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ingen omsætning registreret på services endnu — så snart en bestilling med en service er afsluttet, dukker top-listen op her.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </section>

        <section className="order-1 min-w-0 max-w-full space-y-3 sm:space-y-4 xl:order-2">
          {/* Smart Quick Actions */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Hurtige handlinger</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Prioriteret efter hvad der flytter mest lige nu.</p>
            </div>
              <div className="p-3 sm:p-4">
              <div className="grid gap-2">
                {primaryActions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => a.onClick ? a.onClick() : (a.tab && onNavigate?.(a.tab))}
                      className={cn(
                        "group flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition-all",
                      a.tone === "primary" && "border-foreground/15 bg-foreground text-background hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_hsl(var(--foreground)/0.5)]",
                      a.tone === "accent" && "border-accent/30 bg-accent/[0.06] hover:border-accent/50 hover:bg-accent/[0.10]",
                      a.tone === "muted" && "border-border bg-card hover:border-foreground/20 hover:bg-secondary/60",
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4",
                      a.tone === "primary" && "bg-background/15 text-background",
                      a.tone === "accent" && "bg-accent/15 text-accent",
                      a.tone === "muted" && "border border-border bg-secondary text-foreground",
                    )}>
                      <a.icon />
                    </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-2">
                        <p className={cn("truncate text-sm font-semibold", a.tone === "primary" ? "text-background" : "text-foreground")}>{a.label}</p>
                        {a.badge && (
                          <span className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                            a.tone === "primary" ? "bg-background/20 text-background" : "bg-accent/15 text-accent",
                          )}>{a.badge}</span>
                        )}
                      </div>
                      <p className={cn(
                        "truncate text-xs",
                        a.tone === "primary" ? "text-background/70" : "text-muted-foreground",
                      )}>{a.meta}</p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                      a.tone === "primary" ? "text-background/60" : "text-muted-foreground",
                    )} />
                  </button>
                ))}
              </div>

              {actions.length > primaryActions.length && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <span className="inline-flex items-center gap-1">
                      Vis {actions.length - primaryActions.length} flere
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-1.5">
                    {actions.slice(primaryActions.length).map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => a.onClick ? a.onClick() : (a.tab && onNavigate?.(a.tab))}
                    className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary/60"
                      >
                        <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate text-xs font-medium text-foreground">{a.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>

          {/* Profilfuldendelse */}
          {completeness.pct < 100 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Profilfuldendelse</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Jo mere komplet profilen er, jo stærkere står I udadtil.</p>
                  </div>
                  <div className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                    {completeness.pct}%
                  </div>
                </div>

                <Progress value={completeness.pct} className="mt-4 h-2" />

                <div className="mt-4 space-y-2">
                  {missingItems.slice(0, 3).map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label} mangler</span>
                    </div>
                  ))}
                  {missingItems.length === 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Profilen er komplet</span>
                    </div>
                  )}
                </div>

                <Button size="sm" variant="outline" className="mt-4 h-9 w-full rounded-lg text-sm" onClick={() => onNavigate?.("settings")}>
                  Fuldfør profil
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Stat-detalje-panel — åbnes når et stat-kort/pille klikkes */}
      <StatDetailSheet
        openStat={openStat}
        onClose={() => setOpenStat(null)}
        buckets14={stats.buckets14}
        recentOrders={recentOrders}
        statusLabels={statusLabels}
        statusColors={statusColors}
        onNavigate={onNavigate}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */

/** Lille pille i hero-stripen — kompakt KPI med label/værdi/sub. Klikbar når onClick er sat. */
const SnapshotPill = ({ label, value, sub, accent, onClick }: { label: string; value: string; sub: string; accent?: boolean; onClick?: () => void }) => {
  const className = cn(
    "min-w-0 overflow-hidden rounded-lg border px-2 py-1.5 text-left backdrop-blur-sm transition-all sm:rounded-xl sm:px-3 sm:py-2.5",
    accent ? "border-amber-300/40 bg-amber-400/[0.10]" : "border-background/10 bg-background/[0.05]",
    onClick && "hover:-translate-y-0.5 hover:border-background/25 hover:bg-background/[0.10]",
  );
  const content = (
    <>
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-background/60 sm:text-[10px] sm:tracking-wider">{label}</p>
      <p className="mt-0.5 min-w-0 truncate text-sm font-semibold tabular-nums text-background sm:mt-1 sm:text-xl">{value}</p>
      <p className="truncate text-[9px] text-background/65 sm:mt-0.5 sm:text-[11px]">{sub}</p>
    </>
  );
  if (onClick) {
    return <button type="button" onClick={onClick} className={className}>{content}</button>;
  }
  return <div className={className}>{content}</div>;
};

/** Sparkline — 14 dages mini-søjler. Sidste søjle (i dag) fremhæves. */
const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {data.map((v, i) => {
        const h = Math.max(8, Math.round((v / max) * 100));
        const isToday = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-sm transition-colors",
              isToday ? "bg-foreground" : v > 0 ? "bg-foreground/35" : "bg-foreground/10",
            )}
            style={{ height: `${h}%` }}
            aria-hidden
          />
        );
      })}
    </div>
  );
};

/** SmartStatCard — stat med trend-pille og sparkline. */
const SmartStatCard = ({
  label, value, hint, icon, trend, sparkline, onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
  sparkline?: number[];
  onClick?: () => void;
}) => {
  const cardClass = cn(
    "surface-admin block w-full rounded-xl border-border/80 shadow-sm",
    onClick && "group cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md",
  );
  const body = (
    <Card className={cardClass}>
        <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
            onClick && "group-hover:bg-foreground group-hover:text-background",
          )}>
            {icon}
          </div>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-1.5 sm:gap-2">
          <p className="min-w-0 break-words text-xl font-semibold tabular-nums text-foreground sm:text-[1.75rem]">{value}</p>
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              trend.dir === "up" && "bg-emerald-500/10 text-emerald-700",
              trend.dir === "down" && "bg-rose-500/10 text-rose-700",
              trend.dir === "flat" && "bg-secondary text-muted-foreground",
            )}>
              {trend.dir === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trend.dir === "down" && <ArrowDownRight className="h-3 w-3" />}
              {trend.dir === "flat" && <Minus className="h-3 w-3" />}
              {trend.dir === "flat" ? "uændret" : `${trend.pct}%`}
            </span>
          )}
        </div>
        {sparkline && sparkline.some((v) => v > 0) && (
          <div className="mt-3"><Sparkline data={sparkline} /></div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : <span />}
          {onClick && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Detaljer <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={`${label} — vis detaljer`} className="block w-full text-left">
        {body}
      </button>
    );
  }
  return body;
};

/* ─────────────────────────────────────────────────────────────────────── */

/** OrdersListSection — seneste bestillinger med status-filter + søgning. */
const OrdersListSection = ({
  recentOrders, servicesCount, completeness, orderFilter, setOrderFilter,
  orderSearch, setOrderSearch, orderSort, setOrderSort, onNavigate, copyLink, hasShareUrl,
  statusLabels, statusColors,
}: {
  recentOrders: any[];
  servicesCount: number;
  completeness: number;
  orderFilter: "all" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  setOrderFilter: (v: any) => void;
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  orderSort: "newest" | "oldest" | "amount_desc" | "amount_asc" | "status";
  setOrderSort: (v: any) => void;
  onNavigate?: (tab: string) => void;
  copyLink: () => void;
  hasShareUrl: boolean;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}) => {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: recentOrders.length };
    recentOrders.forEach((o: any) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [recentOrders]);

  const filtered = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const list = recentOrders.filter((o: any) => {
      if (orderFilter !== "all" && o.status !== orderFilter) return false;
      if (!q) return true;
      return (
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").toLowerCase().includes(q) ||
        String(o.total_amount || "").includes(q)
      );
    });
    const statusRank: Record<string, number> = {
      pending: 0, confirmed: 1, in_progress: 2, completed: 3, cancelled: 4,
    };
    const sorted = [...list];
    switch (orderSort) {
      case "oldest":
        sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); break;
      case "amount_desc":
        sorted.sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0)); break;
      case "amount_asc":
        sorted.sort((a, b) => (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0)); break;
      case "status":
        sorted.sort((a, b) => (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
          || +new Date(b.created_at) - +new Date(a.created_at)); break;
      case "newest":
      default:
        sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return sorted;
  }, [recentOrders, orderFilter, orderSearch, orderSort]);

  const sortOptions: { value: typeof orderSort; label: string }[] = [
    { value: "newest", label: "Nyeste først" },
    { value: "oldest", label: "Ældste først" },
    { value: "amount_desc", label: "Højeste beløb" },
    { value: "amount_asc", label: "Laveste beløb" },
    { value: "status", label: "Status (afventer først)" },
  ];
  const activeFilterLabel = chipsLookup(orderFilter);
  const hasActiveFilters = orderFilter !== "all" || orderSearch.trim().length > 0;
  const clearAll = () => { setOrderFilter("all"); setOrderSearch(""); };

  const chips: { key: typeof orderFilter; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "pending", label: "Afventer" },
    { key: "confirmed", label: "Bekræftet" },
    { key: "in_progress", label: "I gang" },
    { key: "completed", label: "Afsluttet" },
    { key: "cancelled", label: "Annulleret" },
  ];

  // ── Tom-tilstande, opdelt så vi giver brugeren konkret handling ────
  if (recentOrders.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Bestillinger fra kunder lander her, så snart de booker.</p>
          </div>
        </div>
          <div className="p-3 sm:p-7">
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center sm:rounded-2xl sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-foreground">Ingen bestillinger endnu</h4>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              {servicesCount === 0
                ? "Først tilføj en service — derefter kan kunder finde og booke jer."
                : completeness < 80
                  ? "Profilen er næsten klar. Færdiggør den, så I rangerer højere i søgningen."
                  : "Profilen er klar. Del jeres link på Facebook eller jeres hjemmeside for at få de første bestillinger."}
            </p>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
              {servicesCount === 0 ? (
                <Button size="sm" className="h-9 rounded-lg" onClick={() => onNavigate?.("services")}>
                  <Briefcase className="mr-1.5 h-4 w-4" /> Tilføj din første service
                </Button>
              ) : completeness < 80 ? (
                <Button size="sm" className="h-9 rounded-lg" onClick={() => onNavigate?.("settings")}>
                  <Target className="mr-1.5 h-4 w-4" /> Fuldfør profil
                </Button>
              ) : (
                hasShareUrl && (
                  <Button size="sm" className="h-9 rounded-lg" onClick={copyLink}>
                    <Share2 className="mr-1.5 h-4 w-4" /> Del jeres profil-link
                  </Button>
                )
              )}
              {servicesCount > 0 && (
                <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => onNavigate?.("services")}>
                  Tilføj endnu en service
                </Button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Seneste bestillinger</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Filtrér efter status eller søg på kunde, e-mail eller beløb.</p>
          </div>
          <button onClick={() => onNavigate?.("orders")} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Se alle <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Søg på kunde, e-mail eller beløb…"
              className="h-9 rounded-lg pl-8 pr-8 text-sm"
            />
            {orderSearch && (
              <button
                type="button"
                onClick={() => setOrderSearch("")}
                aria-label="Ryd søgning"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={orderSort} onValueChange={(v) => setOrderSort(v as typeof orderSort)}>
            <SelectTrigger
              aria-label="Sortér aftaler"
              className="h-9 w-full gap-2 rounded-lg border-border bg-card text-sm font-medium hover:bg-secondary sm:w-[210px]"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 min-[430px]:flex min-[430px]:flex-wrap min-[430px]:items-center">
          {chips.map((chip) => {
            const active = orderFilter === chip.key;
            const n = counts[chip.key] || 0;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setOrderFilter(chip.key)}
                className={cn(
                  "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors min-[430px]:justify-start min-[430px]:px-2.5",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {chip.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-background/15 text-background" : "bg-secondary text-muted-foreground",
                )}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-border">
          {filtered.slice(0, 6).map((order: any) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onNavigate?.("orders")}
              className="grid w-full min-w-0 gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/60 sm:grid-cols-[minmax(0,1.1fr)_auto_auto] sm:items-center sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{order.customer_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Badge className={`${statusColors[order.status] || ""} max-w-full truncate border px-2 py-0.5 text-xs font-medium`}>
                  {statusLabels[order.status] || order.status}
                </Badge>
                {order.status === "pending" && <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">{fmtKr(Number(order.total_amount) || 0)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {filtered.length > 6 && (
            <button
              onClick={() => onNavigate?.("orders")}
              className="flex w-full items-center justify-center gap-1.5 bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Se alle {filtered.length} matchende bestillinger <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">Ingen bestillinger matcher</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Justér eller fjern et af de aktive filtre nedenfor."
              : "Der er ingen bestillinger at vise her endnu."}
          </p>
          {hasActiveFilters && (
            <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-1.5">
              {orderFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setOrderFilter("all")}
                  className="group inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/40"
                  aria-label={`Fjern statusfilter ${activeFilterLabel}`}
                >
                  <span className="text-muted-foreground">Status:</span> {activeFilterLabel}
                  <X className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
              )}
              {orderSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setOrderSearch("")}
                  className="group inline-flex max-w-[220px] items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/40"
                  aria-label="Ryd søgning"
                >
                  <span className="text-muted-foreground">Søgning:</span>
                  <span className="truncate">“{orderSearch.trim()}”</span>
                  <X className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
              )}
            </div>
          )}
          {hasActiveFilters && (
            <Button size="sm" variant="outline" className="mt-3 h-8 rounded-lg" onClick={clearAll}>
              <X className="mr-1 h-3.5 w-3.5" /> Nulstil alle filtre
            </Button>
          )}
        </div>
      )}
    </>
  );
};

const chipsLookup = (k: string) => ({
  all: "Alle", pending: "Afventer", confirmed: "Bekræftet",
  in_progress: "I gang", completed: "Afsluttet", cancelled: "Annulleret",
}[k] || k);

/* ─────────────────────────────────────────────────────────────────────── */

/** StatDetailSheet — drawer med 14-dages graf + relevant bestillingsliste. */
const StatDetailSheet = ({
  openStat, onClose, buckets14, recentOrders, statusLabels, statusColors, onNavigate,
}: {
  openStat: null | "revenue" | "orders" | "today" | "pending" | "rating";
  onClose: () => void;
  buckets14: { rev: number; count: number }[];
  recentOrders: any[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  onNavigate?: (tab: string) => void;
}) => {
  const isCompactSheet = useIsBelowBreakpoint(640);
  const [granularity, setGranularity] = useState<"day" | "week">("day");
  const [rangeDays, setRangeDays] = useState<number>(7);

  // Når kuffen åbnes på "today" giver kun 1-dag mening — ellers default 7.
  useMemo(() => {
    if (openStat === "today") { setGranularity("day"); setRangeDays(1); }
    else if (openStat === "revenue" || openStat === "orders") { setRangeDays(7); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openStat]);

  const config = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const tomorrow = +todayStart + DAY_MS;
    const rangeStart = +todayStart - (rangeDays - 1) * DAY_MS;

    switch (openStat) {
      case "revenue":
        return {
          title: `Omsætning · seneste ${rangeDays === 1 ? "dag" : `${rangeDays} dage`}`,
          subtitle: "Skift mellem dag- og ugevisning herunder",
          mode: "revenue" as const,
          orders: recentOrders.filter((o: any) => {
            const t = +new Date(o.created_at);
            return t >= rangeStart && t < tomorrow && o.status !== "cancelled";
          }),
          showChart: true,
        };
      case "orders":
        return {
          title: `Bestillinger · seneste ${rangeDays === 1 ? "dag" : `${rangeDays} dage`}`,
          subtitle: "Skift mellem dag- og ugevisning herunder",
          mode: "count" as const,
          orders: recentOrders.filter((o: any) => {
            const t = +new Date(o.created_at);
            return t >= rangeStart && t < tomorrow;
          }),
          showChart: true,
        };
      case "today":
        return {
          title: "Aktivitet i dag",
          subtitle: new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" }),
          mode: "count" as const,
          orders: recentOrders.filter((o: any) => {
            const t = +new Date(o.created_at);
            return t >= +todayStart && t < tomorrow;
          }),
          showChart: false,
        };
      case "pending":
        return {
          title: "Afventende bestillinger",
          subtitle: "Svar hurtigt — hver time tæller for konverteringen",
          mode: "count" as const,
          orders: recentOrders.filter((o: any) => o.status === "pending"),
          showChart: false,
        };
      default:
        return null;
    }
  }, [openStat, recentOrders, rangeDays]);

  const open = openStat !== null && !!config;
  if (!config) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side={isCompactSheet ? "bottom" : "right"} className={cn("w-full", isCompactSheet ? "h-[86dvh] rounded-t-2xl" : "sm:max-w-md")} />
      </Sheet>
    );
  }

  const totalValue = config.mode === "revenue"
    ? config.orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
    : config.orders.length;

  // Byg dag- eller uge-bins ud fra de filtrerede ordrer for det valgte interval.
  const chartBins = (() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    if (granularity === "day") {
      const days = rangeDays;
      const bins = Array.from({ length: days }, (_, i) => {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - (days - 1 - i));
        return { date: d, label: d.toLocaleDateString("da-DK", { weekday: "short" }).slice(0, 2), value: 0 };
      });
      config.orders.forEach((o: any) => {
        const t = new Date(o.created_at); t.setHours(0, 0, 0, 0);
        const idx = bins.findIndex((b) => +b.date === +t);
        if (idx >= 0) bins[idx].value += config.mode === "revenue" ? Number(o.total_amount || 0) : 1;
      });
      return bins;
    }
    // Uge-visning — del intervallet op i 7-dages buckets, nyeste til sidst.
    const weeks = Math.max(1, Math.ceil(rangeDays / 7));
    const bins = Array.from({ length: weeks }, (_, i) => {
      const end = new Date(todayStart); end.setDate(end.getDate() - (weeks - 1 - i) * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      return { date: end, label: `${start.getDate()}/${start.getMonth() + 1}`, value: 0 };
    });
    config.orders.forEach((o: any) => {
      const t = new Date(o.created_at); t.setHours(0, 0, 0, 0);
      for (let i = bins.length - 1; i >= 0; i--) {
        const end = bins[i].date;
        const start = new Date(end); start.setDate(start.getDate() - 6);
        if (+t >= +start && +t <= +end) {
          bins[i].value += config.mode === "revenue" ? Number(o.total_amount || 0) : 1;
          break;
        }
      }
    });
    return bins;
  })();
  const chartMax = Math.max(1, ...chartBins.map((b) => b.value));
  const rangeOptions = [
    { value: 7, label: "7 dage" },
    { value: 14, label: "14 dage" },
    { value: 30, label: "30 dage" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={isCompactSheet ? "bottom" : "right"}
        className={cn("w-full overflow-hidden p-0 flex flex-col", isCompactSheet ? "h-[88dvh] rounded-t-2xl" : "sm:max-w-lg")}
      >
        <SheetHeader className="border-b border-border bg-secondary/40 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-foreground">{config.title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">{config.subtitle}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
          {/* Total for valgt interval */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {config.mode === "revenue" ? "Total omsætning" : "Antal bestillinger"}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {rangeDays === 1 ? "I dag" : `Seneste ${rangeDays} dage`}
              </span>
            </div>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {config.mode === "revenue" ? fmtKr(totalValue) : totalValue}
            </p>
            {config.orders.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {config.mode === "revenue"
                  ? `${config.orders.length} bestillinger · gennemsnit ${fmtKr(totalValue / Math.max(1, config.orders.length))}`
                  : `Ud af ${recentOrders.length} bestillinger i alt`}
              </p>
            )}
          </div>

          {/* Graf med dag/uge-toggle */}
          {config.showChart && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {granularity === "day" ? "Dag for dag" : "Uge for uge"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
                    {(["day", "week"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setGranularity(g); if (g === "week" && rangeDays < 14) setRangeDays(14); }}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          granularity === g ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {g === "day" ? "Dag" : "Uge"}
                      </button>
                    ))}
                  </div>
                  <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
                    <SelectTrigger
                      aria-label="Vælg interval"
                      className="h-7 w-auto gap-1.5 rounded-md border-border bg-card px-2 text-[11px] font-semibold text-foreground hover:bg-secondary"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {rangeOptions.filter((o) => granularity === "day" ? true : o.value >= 14).map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex h-32 items-end gap-2">
                {chartBins.map((b, i) => {
                  const h = Math.max(6, Math.round((b.value / chartMax) * 100));
                  const isLast = i === chartBins.length - 1;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {b.value > 0 ? (config.mode === "revenue" ? fmtKrShort(b.value) : b.value) : ""}
                      </span>
                      <div
                        className={cn(
                          "w-full rounded-md transition-colors",
                          isLast ? "bg-foreground" : b.value > 0 ? "bg-foreground/40" : "bg-foreground/10",
                        )}
                        style={{ height: `${h}%` }}
                        aria-label={`${b.label}: ${b.value}`}
                      />
                      <span className="truncate text-[10px] font-medium uppercase text-muted-foreground">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bestillingsliste */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Relevante bestillinger ({config.orders.length})
              </p>
            </div>
            {config.orders.length > 0 ? (
              <div className="divide-y divide-border">
                {config.orders.slice(0, 12).map((order: any) => (
                  <SheetClose asChild key={order.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate?.("orders")}
                      className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{order.customer_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge className={`${statusColors[order.status] || ""} border px-1.5 py-0.5 text-[10px] font-medium`}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span className="text-sm font-semibold tabular-nums text-foreground">{fmtKr(Number(order.total_amount) || 0)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </SheetClose>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ingen bestillinger i denne periode.
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => { onClose(); onNavigate?.("orders"); }}>
            Åbn fuld bestillingsliste <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DashboardTab;

/* ─────────────────────────────────────────────────────────────────────── */

/** DashboardSkeleton — vises mens overblikkets data hentes første gang. */
export const DashboardSkeleton = () => {
  const Shimmer = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded-md bg-secondary/70", className)} />
  );
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      {/* Hero */}
      <section
        className="relative isolate overflow-hidden rounded-2xl px-5 py-6 sm:px-8 sm:py-8"
        style={{ backgroundColor: "hsl(var(--hero-bg))" }}
      >
        <div className="space-y-3">
          <div className="h-3 w-48 animate-pulse rounded bg-background/15" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded bg-background/20" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-background/15" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-background/10 bg-background/[0.06] p-3">
              <div className="h-2.5 w-14 animate-pulse rounded bg-background/20" />
              <div className="mt-2 h-5 w-12 animate-pulse rounded bg-background/25" />
              <div className="mt-1 h-2.5 w-20 animate-pulse rounded bg-background/15" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid w-full max-w-full min-w-0 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0 space-y-3 sm:space-y-4">
          {/* Stat cards */}
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="surface-admin rounded-xl border-border/80 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-7 w-7 rounded-lg" />
                  </div>
                  <Shimmer className="mt-3 h-8 w-32" />
                  <div className="mt-3 flex h-8 min-w-0 items-end gap-[3px] overflow-hidden">
                    {Array.from({ length: 14 }).map((_, j) => (
                      <div
                        key={j}
                        className="w-1.5 animate-pulse rounded-sm bg-secondary/70"
                        style={{ height: `${20 + ((j * 13) % 70)}%` }}
                      />
                    ))}
                  </div>
                  <Shimmer className="mt-3 h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent orders skeleton */}
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="mt-2 h-3 w-64 max-w-full" />
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <Shimmer className="h-9 w-full rounded-lg" />
                <Shimmer className="h-9 w-full rounded-lg sm:w-[210px]" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 min-[430px]:flex min-[430px]:flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-6 w-full rounded-full min-[430px]:w-20" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_auto_auto] sm:items-center sm:px-5">
                  <div className="space-y-2">
                    <Shimmer className="h-4 w-40" />
                    <Shimmer className="h-3 w-24" />
                  </div>
                  <Shimmer className="h-5 w-20 rounded-full" />
                  <div className="flex items-center justify-end gap-2">
                    <Shimmer className="h-4 w-16" />
                    <Shimmer className="h-4 w-4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="mt-2 h-3 w-48 max-w-full" />
            </div>
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Shimmer className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-3/4" />
                    <Shimmer className="h-3 w-1/2" />
                  </div>
                  <Shimmer className="h-4 w-4 rounded" />
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
      <span className="sr-only">Henter dit overblik…</span>
    </div>
  );
};