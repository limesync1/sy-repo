import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders, useCreateBusiness,
  useReviews,
} from "@/hooks/useDatabase";
import { Navigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useEffect, useState, lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";
// Lazy load tunge tabs så hver fane først downloades når brugeren åbner den
const DashboardTab = lazy(() => import("@/components/admin/DashboardTab"));
const DashboardSkeleton = lazy(() =>
  import("@/components/admin/DashboardTab").then((m) => ({ default: m.DashboardSkeleton }))
);
const ReviewsTab = lazy(() => import("@/components/admin/ReviewsTab"));
const AftaleTab = lazy(() => import("@/components/admin/AftaleTab"));
const EmployeesTab = lazy(() => import("@/components/admin/EmployeesTab"));
const CustomersTab = lazy(() => import("@/components/admin/CustomersTab"));
const SettingsTab = lazy(() => import("@/components/admin/SettingsTab"));
const LeadsTab = lazy(() => import("@/components/admin/LeadsTab"));
const BusinessLiveChatTab = lazy(() => import("@/components/admin/BusinessLiveChatTab"));
const AccountingTab = lazy(() => import("@/components/admin/AccountingTab"));
// ServicesTab er ~1700 linjer (formular, prisberegner, regnskab) — split ud
// så det kun loades når brugeren faktisk åbner Services-fanen.
const ServicesTab = lazy(() => import("@/components/admin/ServicesTab"));
import BusinessOnboarding from "@/components/admin/BusinessOnboarding";
import OnboardingHub from "@/components/admin/onboarding/OnboardingHub";
import SEO from "@/components/SEO";
import { AdminShell, type AdminTabKey } from "@/components/admin/shared/AdminShell";
import { ShellSkeleton, ListCardSkeleton, StatGridSkeleton, PageSkeleton, FormSkeleton, FilterBarSkeleton, PageHeaderSkeleton, ChartSkeleton } from "@/components/admin/shared/Skeletons";
import { TabErrorBoundary } from "@/components/admin/shared/TabErrorBoundary";
import { TabPerfTracker } from "@/components/admin/shared/usePerfMark";
import TrialBanner from "@/components/admin/TrialBanner";
import ReactivateDialog from "@/components/admin/ReactivateDialog";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import {
  INDUSTRY_GROUPS,
} from "@/lib/service-taxonomy";

/* ─── Constants ─── */

/**
 * TabFallback — vis et skeleton der matcher hver fane mens chunk + data loader.
 * Erstatter den gamle "Indlæser…" tekst, så panelet føles instant og smooth.
 */
const TabFallback = ({ tab }: { tab: string }) => {
  switch (tab) {
    case "dashboard":
      // Brug den rigtige DashboardSkeleton (med hero-form) så chunk-load og
      // data-load viser samme silhuet — ellers ser brugeren to forskellige
      // skeletons inden indholdet kommer.
      return (
        <Suspense fallback={<div className="h-[60vh]" />}>
          <DashboardSkeleton />
        </Suspense>
      );
    case "leads":
    case "aftale":
    case "customers":
      return <PageSkeleton statsCount={4} rows={6} withFilters />;
    case "employees":
      return <PageSkeleton statsCount={3} rows={4} />;
    case "reviews":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction={false} />
          <StatGridSkeleton count={3} cols="sm:grid-cols-3" />
          <FilterBarSkeleton chips={1} withAction={false} />
          <ListCardSkeleton rows={4} />
        </div>
      );
    case "livechat":
      return (
        <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[320px_1fr] animate-fade-in">
          <ListCardSkeleton rows={6} />
          <ListCardSkeleton rows={8} />
        </div>
      );
    case "accounting":
    case "settings":
      return (
        <div className="space-y-5 animate-fade-in">
          <PageHeaderSkeleton />
          <FormSkeleton fields={6} />
        </div>
      );
    case "services":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton />
          <FilterBarSkeleton chips={2} withAction />
          <ListCardSkeleton rows={5} />
        </div>
      );
    case "routes":
      return (
        <div className="space-y-4 animate-fade-in">
          <PageHeaderSkeleton withAction />
          <FilterBarSkeleton chips={3} />
          <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
            <ListCardSkeleton rows={4} />
            <div className="rounded-xl border border-border/80 bg-card h-[60vh] animate-pulse" />
          </div>
        </div>
      );
    default:
      return <PageSkeleton />;
  }
};
// Branche-katalog ligger centralt i src/lib/service-taxonomy.ts.
// CreateBusinessForm bruger en kompakt visning af de mest brugte herfra.


/* ─── Entry ─── */
const Admin = () => {
  const { user, loading } = useAuth();
  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/log-ind" replace />;
  return <AdminDashboard />;
};

/* ─── Main Dashboard ─── */
const AdminDashboard = () => {
  const { data: business, isLoading } = useMyBusiness();
  const { data: plan } = useBusinessPlan(business?.id);
  const location = useLocation();
  // Læs ?tab=xxx synkront ved første render så vi ALDRIG flasher "Overblik" når
  // brugeren navigerer fra fx Ruteplanlæggeren til en anden fane.
  const initialTab = ((): AdminTabKey => {
    if (typeof window === "undefined") return "dashboard";
    const t = new URLSearchParams(window.location.search).get("tab") as AdminTabKey | null;
    const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","livechat","accounting","settings"];
    return t && allowed.includes(t) ? t : "dashboard";
  })();
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);

  // Hold URL'en synkroniseret med aktiv fane (uden at trigge en ekstra render-cyklus).
  // Bruges også når brugeren klikker browserens tilbage-pil.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("tab") as AdminTabKey | null;
      const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","livechat","accounting","settings"];
      setActiveTab(t && allowed.includes(t) ? t : "dashboard");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Reager også på React Router-navigation (fx når banneret "Tilføj
  // betalingskort" klikkes mens vi allerede er på /virksomhed) — uden dette
  // bliver fanen ikke skiftet, fordi React Router ikke fyrer popstate.
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab") as AdminTabKey | null;
    const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","livechat","accounting","settings"];
    const next = t && allowed.includes(t) ? t : "dashboard";
    setActiveTab((curr) => (curr === next ? curr : next));
  }, [location.search]);

  const handleTabChange = (tab: AdminTabKey) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "dashboard") url.searchParams.delete("tab");
      else url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (isLoading) return <ShellSkeleton />;
  if (!business) return <BusinessOnboarding />;

  // Hvis leads-fanen er slået fra i Indstillinger → Avanceret, men URL'en peger
  // på ?tab=leads (fx fra et bogmærke), falder vi pænt tilbage til Overblik.
  const leadsEnabled = !!(business.settings as any)?.leads_enabled;
  const livechatEnabled = !!(business.settings as any)?.livechat_enabled;
  const effectiveTab: AdminTabKey =
    (activeTab === "leads" && !leadsEnabled) ||
    (activeTab === "livechat" && !livechatEnabled)
      ? "dashboard"
      : activeTab;

  const renderContent = () => {
    switch (effectiveTab) {
      case "dashboard": return <DashboardWrapper business={business} onNavigate={(t) => handleTabChange(t as AdminTabKey)} />;
      case "services": return <ServicesTab businessId={business.id} business={business} />;
      case "orders": return (
        <AftaleTab
          businessId={business.id}
          businessName={business.name}
          routePlanningEnabled={!!(business.settings as any)?.route_planning_enabled}
        />
      );
      case "customers": return <CustomersTab businessId={business.id} businessName={business.name} />;
      case "employees": return <EmployeesTab businessId={business.id} businessName={business.name} routePlanningEnabled={!!(business.settings as any)?.route_planning_enabled} />;
      case "reviews": return <ReviewsWrapper businessId={business.id} />;
      case "leads": return <LeadsTab businessId={business.id} />;
      case "livechat": return <BusinessLiveChatTab businessId={business.id} businessName={business.name} />;
      case "accounting": return <AccountingTab businessId={business.id} businessName={business.name} />;
      case "settings": return <SettingsTab business={business} />;
      default: return null;
    }
  };

  return (
    <AdminShell business={business} activeTab={effectiveTab} onTabChange={handleTabChange}>
      <SEO
        title="Virksomhedspanel – Serviceydere"
        description="Administrer din virksomhed, aftaler, services og medarbejdere på Serviceydere."
        noIndex
      />
      {/* Vises altid i toppen af panelet, undtagen når brugeren allerede er
          inde på Indstillinger-fanen — så ville knappen "Tilføj kort" pege
          på samme side. */}
      {plan && plan.status !== "active" && plan.status !== "unknown" && (
        <div className="mb-4">
          <TrialBanner plan={plan} hideAction={activeTab === "settings"} />
        </div>
      )}
      {/* Onboarding-hub: velkomst-wizard ved første login + persistent
          checkliste i toppen indtil alle kerne-trin er gjort. */}
      <OnboardingHub business={business} />
      <TabErrorBoundary resetKey={effectiveTab} label={effectiveTab}>
        <Suspense fallback={<TabFallback tab={effectiveTab} />}>
          {/* Én enkelt, blød fade-in pr. fane-skift. key sikrer at animationen
              kun kører når faner faktisk skifter — ikke når interne state-
              opdateringer (filtre, dialoger) re-renderer indholdet. */}
          <div key={effectiveTab} className="animate-fade-in-soft">
            <TabPerfTracker tab={effectiveTab} />
            {renderContent()}
          </div>
        </Suspense>
      </TabErrorBoundary>

      {/* Hvis prøven er udløbet og der ikke er noget kort → blokér panelet
          indtil brugeren har genaktiveret med kortoplysninger. */}
      {plan?.status === "expired" && (
        <ReactivateDialog open businessId={business.id} businessName={business.name} />
      )}
    </AdminShell>
  );
};

/* ─── Dashboard Wrapper ─── */
const DashboardWrapper = ({ business, onNavigate }: { business: any; onNavigate: (tab: string) => void }) => {
  const { data: orders, isLoading: loadingOrders } = useOrders(business.id);
  const { data: services, isLoading: loadingServices } = useServices(business.id);
  const { data: reviews, isLoading: loadingReviews } = useReviews(business.id);

  // Vis skeleton mens første hit på overblik henter data — ellers blinkede
  // tomme tal (0 kr, 0 anmeldelser) frem i et splitsekund og blev så udskiftet
  // med rigtige værdier, hvilket føltes som om siden loadede to gange.
  if (loadingOrders || loadingServices || loadingReviews) {
    return <DashboardSkeleton />;
  }

  const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <DashboardTab
      business={business}
      ordersCount={orders?.length || 0}
      revenue={revenue}
      servicesCount={services?.length || 0}
      averageRating={avgRating}
      reviewsCount={reviews?.length || 0}
      pendingOrders={pendingOrders}
      recentOrders={orders || []}
      reviews={reviews || []}
      services={services || []}
      onNavigate={onNavigate}
    />
  );
};

/* ─── Reviews Wrapper ─── */
const ReviewsWrapper = ({ businessId }: { businessId: string }) => {
  const { data: reviews, isLoading } = useReviews(businessId);
  return <ReviewsTab reviews={reviews || []} isLoading={isLoading} />;
};

/* ─── Create Business ─── */
const CreateBusinessForm = () => {
  const { user } = useAuth();
  const createBiz = useCreateBusiness();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (c: string) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error("Indtast et navn"); return; }
    if (selectedCategories.length === 0) { toast.error("Vælg mindst én branche"); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "");
    createBiz.mutate({
      name: name.trim(), slug, description: description.trim() || null,
      owner_id: user!.id,
      category: selectedCategories[0] || null,
      categories: selectedCategories,
    } as any, {
      onSuccess: () => toast.success("Virksomhed oprettet!"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <CardTitle className="text-xl">Opret din virksomhed</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">Udfyld oplysningerne for at komme i gang.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Beskrivelse (valgfrit)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Vælg brancher (vælg en eller flere)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Du kan finjustere og tilføje flere brancher senere i Indstillinger.
            </p>
            <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
              {INDUSTRY_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {g.industries.map((ind) => (
                      <button key={ind.key} type="button" onClick={() => toggleCategory(ind.key)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all ${
                          selectedCategories.includes(ind.key)
                            ? "border-foreground bg-foreground/5 shadow-sm"
                            : "border-border bg-card hover:border-foreground/30"
                        }`}>
                        <span className="text-base leading-none">{ind.icon}</span>
                        <span className="truncate text-xs font-medium text-foreground">{ind.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createBiz.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm">
            {createBiz.isPending ? "Opretter..." : "Opret virksomhed"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};



export default Admin;
