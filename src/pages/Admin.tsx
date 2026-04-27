import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders, useCreateBusiness, useCreateService,
  useUpdateService, useDeleteService, useUpdateBusiness,
  useUpsertCalculatorSteps, useReviews,
} from "@/hooks/useDatabase";
import { Navigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEffect, useState, lazy, Suspense } from "react";
import {
  Plus, Trash2,
  Sparkles, Calculator, Wrench, Wand2, Loader2,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
// Lazy load tunge tabs så hver fane først downloades når brugeren åbner den
const DashboardTab = lazy(() => import("@/components/admin/DashboardTab"));
const ReviewsTab = lazy(() => import("@/components/admin/ReviewsTab"));
const AftaleTab = lazy(() => import("@/components/admin/AftaleTab"));
const EmployeesTab = lazy(() => import("@/components/admin/EmployeesTab"));
const CustomersTab = lazy(() => import("@/components/admin/CustomersTab"));
const SettingsTab = lazy(() => import("@/components/admin/SettingsTab"));
const LeadsTab = lazy(() => import("@/components/admin/LeadsTab"));
import BusinessOnboarding from "@/components/admin/BusinessOnboarding";
import { PageHeader, PrimaryButton, SectionCard, FieldLabel, EmptyState } from "@/components/admin/shared/AdminUI";
import { AdminShell, type AdminTabKey } from "@/components/admin/shared/AdminShell";
import TrialBanner from "@/components/admin/TrialBanner";
import ReactivateDialog from "@/components/admin/ReactivateDialog";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import {
  INDUSTRY_GROUPS,
  ALL_INDUSTRIES,
  findIndustry,
  industryIcon,
  subcategoriesForIndustries,
  stepTemplatesForIndustries,
} from "@/lib/service-taxonomy";

/* ─── Constants ─── */
// Branche-katalog ligger centralt i src/lib/service-taxonomy.ts.
// CreateBusinessForm bruger en kompakt visning af de mest brugte herfra.

const STEP_TEMPLATES: Record<string, { label: string; steps: Array<{ label: string; unit: string; price_per_unit: number; min_value: number; max_value: number; default_value: number }> }[]> = {
  "Rengøring": [
    { label: "Kontor / erhvervsrengøring", steps: [
      { label: "Støvsugning", unit: "m²", price_per_unit: 5, min_value: 10, max_value: 500, default_value: 50 },
      { label: "Tømning af skraldespande", unit: "stk", price_per_unit: 5, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Aftørring af borde", unit: "stk", price_per_unit: 12, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Gulvvask", unit: "m²", price_per_unit: 8, min_value: 10, max_value: 500, default_value: 50 },
    ]},
    { label: "Privat hjemmerengøring", steps: [
      { label: "Antal rum", unit: "rum", price_per_unit: 80, min_value: 1, max_value: 15, default_value: 4 },
      { label: "Badeværelser", unit: "stk", price_per_unit: 120, min_value: 0, max_value: 5, default_value: 1 },
      { label: "Køkken", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 2, default_value: 1 },
    ]},
    { label: "Vinduespolering", steps: [
      { label: "Vinduer", unit: "stk", price_per_unit: 25, min_value: 1, max_value: 100, default_value: 10 },
      { label: "Franske altandøre", unit: "stk", price_per_unit: 60, min_value: 0, max_value: 20, default_value: 0 },
    ]},
    { label: "Flytterengøring", steps: [
      { label: "Boligstørrelse", unit: "m²", price_per_unit: 15, min_value: 20, max_value: 300, default_value: 80 },
      { label: "Ovn rengøring", unit: "stk", price_per_unit: 200, min_value: 0, max_value: 2, default_value: 1 },
      { label: "Køleskab rengøring", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 3, default_value: 1 },
    ]},
  ],
  "Haveservice": [
    { label: "Græsslåning", steps: [
      { label: "Areal", unit: "m²", price_per_unit: 2, min_value: 50, max_value: 5000, default_value: 200 },
      { label: "Kantklipning", unit: "m", price_per_unit: 5, min_value: 0, max_value: 200, default_value: 20 },
    ]},
    { label: "Hækkeklipning", steps: [
      { label: "Hæklængde", unit: "m", price_per_unit: 40, min_value: 1, max_value: 200, default_value: 10 },
      { label: "Højde", unit: "m", price_per_unit: 30, min_value: 1, max_value: 5, default_value: 2 },
    ]},
  ],
  "Maler": [
    { label: "Vægmaling", steps: [
      { label: "Vægflade", unit: "m²", price_per_unit: 45, min_value: 5, max_value: 500, default_value: 30 },
      { label: "Loftflade", unit: "m²", price_per_unit: 55, min_value: 0, max_value: 200, default_value: 0 },
      { label: "Antal strøg", unit: "stk", price_per_unit: 15, min_value: 1, max_value: 3, default_value: 2 },
    ]},
  ],
  "Håndværker": [
    { label: "Generelt håndværkerarbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 400, min_value: 1, max_value: 40, default_value: 2 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
    ]},
  ],
  "VVS": [
    { label: "VVS-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 500, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
      { label: "Kørsel", unit: "km", price_per_unit: 8, min_value: 0, max_value: 100, default_value: 10 },
    ]},
  ],
  "Elektriker": [
    { label: "El-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Stikkontakter", unit: "stk", price_per_unit: 350, min_value: 0, max_value: 20, default_value: 0 },
      { label: "Lampeudtag", unit: "stk", price_per_unit: 400, min_value: 0, max_value: 20, default_value: 0 },
    ]},
  ],
};

const SERVICE_CATEGORIES: Record<string, Record<string, string[]>> = {
  "Rengøring": {
    "Privatrengøring": ["Hjemmerengøring", "Hovedrengøring", "Flytterengøring"],
    "Erhvervsrengøring": ["Rengøring af kontor", "Gulvrens", "Sanitetsrengøring"],
    "Trappevask": ["Trappevask", "Opgangsrengøring"],
    "Vinduespolering": ["Traditionel vinduespolering", "Vinduespolering med rentvandsanlæg"],
  },
  "Håndværker": {
    "Tømrer": ["Tilbygning", "Tagarbejde", "Altan"],
    "Murer": ["Murværk", "Flisearbejde", "Facaderenovering"],
    "Gulvlægning": ["Trægulv", "Vinylgulv", "Epoxygulv"],
  },
  "Haveservice": {
    "Havevedligehold": ["Græsslåning", "Hækkeklipning", "Ukrudtsbekæmpelse"],
    "Anlægsarbejde": ["Beplantning", "Belægning", "Haveprojekt"],
    "Træfældning": ["Træfældning", "Stubbefræsning", "Beskæring"],
  },
  "Maler": {
    "Indvendig maling": ["Vægmaling", "Loftmaling", "Lakering"],
    "Udvendig maling": ["Facademaling", "Vinduer og døre"],
    "Tapetsering": ["Tapetsering", "Fibervæv"],
  },
  "VVS": {
    "Vandinstallation": ["Vandhane", "Toilet", "Badeværelse"],
    "Varmeinstallation": ["Radiator", "Gulvvarme", "Varmepumpe"],
    "Kloakarbejde": ["Kloakservice", "Afløb", "Drænarbejde"],
  },
  "Elektriker": {
    "Elinstallation": ["Stikkontakter", "Belysning", "Eltavle"],
    "EL-tjek": ["Elftersynsrapport", "Sikkerhedsgennemgang"],
  },
  "Flyttehjælp": {
    "Privat flytning": ["Lokal flytning", "Langdistance flytning"],
    "Erhvervsflytning": ["Kontorflytning", "Lagerflytning"],
  },
  "Sikkerhed": {
    "Alarmsystemer": ["Tyverialarm", "Brandalarm"],
    "Videoovervågning": ["IP-kamera", "Videoovervågning"],
  },
};

/* ─── Entry ─── */
const Admin = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
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
    const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","settings"];
    return t && allowed.includes(t) ? t : "dashboard";
  })();
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);

  // Hold URL'en synkroniseret med aktiv fane (uden at trigge en ekstra render-cyklus).
  // Bruges også når brugeren klikker browserens tilbage-pil.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("tab") as AdminTabKey | null;
      const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","settings"];
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
    const allowed: AdminTabKey[] = ["dashboard","services","orders","customers","employees","reviews","leads","settings"];
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

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!business) return <BusinessOnboarding />;

  // Hvis leads-fanen er slået fra i Indstillinger → Avanceret, men URL'en peger
  // på ?tab=leads (fx fra et bogmærke), falder vi pænt tilbage til Overblik.
  const leadsEnabled = !!(business.settings as any)?.leads_enabled;
  const effectiveTab: AdminTabKey =
    activeTab === "leads" && !leadsEnabled ? "dashboard" : activeTab;

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
      case "settings": return <SettingsTab business={business} />;
      default: return null;
    }
  };

  return (
    <AdminShell business={business} activeTab={effectiveTab} onTabChange={handleTabChange}>
      {/* Vises altid i toppen af panelet, undtagen når brugeren allerede er
          inde på Indstillinger-fanen — så ville knappen "Tilføj kort" pege
          på samme side. */}
      {plan && plan.status !== "active" && plan.status !== "unknown" && (
        <div className="mb-4">
          <TrialBanner plan={plan} hideAction={activeTab === "settings"} />
        </div>
      )}
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Indlæser…</div>}>
        {renderContent()}
      </Suspense>

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
  const { data: orders } = useOrders(business.id);
  const { data: services } = useServices(business.id);
  const { data: reviews } = useReviews(business.id);

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

/* ─── Services Tab ─── */
const ServicesTab = ({ businessId, business }: { businessId: string; business: any }) => {
  const { data: services, isLoading } = useServices(businessId);
  const { data: orders } = useOrders(businessId);
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isFocusMode = showForm || editingId !== null;

  // Brancher virksomheden har valgt i Indstillinger — styrer hvad der kan oprettes
  const businessIndustries: string[] =
    (business?.categories as string[]) ||
    (business?.category ? [business.category] : []);
  const hasIndustries = businessIndustries.length > 0;
  // Underkategorier valgt i Indstillinger pr. branche — finkornet styring
  const selectedSubcategoriesByIndustry: Record<string, string[]> =
    ((business?.settings as any)?.selected_subcategories as Record<string, string[]>) || {};

  // Count orders per service
  const orderCountByService: Record<string, number> = {};
  orders?.forEach((o: any) => {
    o.order_items?.forEach((item: any) => {
      if (item.service_id) {
        orderCountByService[item.service_id] = (orderCountByService[item.service_id] || 0) + item.quantity;
      }
    });
  });

  const uniqueCategories = [...new Set((services || []).map((s: any) => s.service_category).filter(Boolean))];
  const filtered = filterCategory
    ? services?.filter((s: any) => s.service_category === filterCategory)
    : services;
  const activeServices = (services || []).filter((s: any) => s.is_active !== false).length;
  const totalOrders = Object.values(orderCountByService).reduce((a, b) => a + b, 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser services...</p>;

  // Focus-mode: når man opretter eller redigerer en service, skjuler vi alt andet
  // (statistik, filtre og listen) så man kun ser formularen.
  if (isFocusMode) {
    const editingService = editingId
      ? (services || []).find((s: any) => s.id === editingId)
      : null;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Tilbage til services
            </button>
            <h2 className="mt-2 text-xl font-semibold text-foreground truncate">
              {editingService ? `Rediger "${editingService.name}"` : "Ny service"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {editingService
                ? "Opdater detaljer, pris og intervaller for denne service."
                : "Følg trinnene for at oprette en ny service."}
            </p>
          </div>
        </div>

        {showForm && !hasIndustries && (
          <Card className="surface-admin rounded-xl border-amber-300 bg-amber-50 shadow-sm">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Vælg jeres brancher først</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Når I har valgt brancher i Indstillinger, ser I kun service-typer der passer til jeres virksomhed.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg">
                <a href="/virksomhed?tab=settings">Gå til Indstillinger</a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <ServiceForm
              key={editingService?.id || "new"}
              businessId={editingService?.business_id || businessId}
              businessIndustries={businessIndustries}
              selectedSubcategoriesByIndustry={selectedSubcategoriesByIndustry}
              existingService={editingService || undefined}
              onClose={() => { setShowForm(false); setEditingId(null); }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Servicekatalog"
        description={`${services?.length || 0} services · ${totalOrders} bestillinger i alt`}
        action={
          <PrimaryButton onClick={() => setShowForm(true)} icon={<Plus />}>
            Tilføj service
          </PrimaryButton>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Services i alt</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{services?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aktive</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{activeServices}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bestillinger</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{totalOrders}</p>
            </CardContent>
          </Card>
        </div>

        {uniqueCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              onClick={() => setFilterCategory("")}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${!filterCategory ? "border-border bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              Alle
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${filterCategory === cat ? "border-border bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {uniqueCategories.length > 1 && (
        <div className="hidden" />
      )}

      <div className="space-y-3">
        {filtered?.map((s: any) => (
          <ServiceRow
            key={s.id}
            service={s}
            orderCount={orderCountByService[s.id] || 0}
            onEdit={() => setEditingId(s.id)}
            onDelete={() => deleteService.mutate(s.id)}
          />
        ))}
        {(!filtered || filtered.length === 0) && !showForm && (
          <EmptyState
            icon={<Wrench />}
            title={filterCategory ? `Ingen services i "${filterCategory}"` : "Ingen services endnu"}
            description="Tilføj din første service for at komme i gang."
            action={
              <PrimaryButton onClick={() => setShowForm(true)} icon={<Plus />}>
                Tilføj service
              </PrimaryButton>
            }
          />
        )}
      </div>
    </div>
  );
};

const ServiceRow = ({ service, orderCount, onEdit, onDelete }: { service: any; orderCount: number; onEdit: () => void; onDelete: () => void }) => {
  const pricingLabels: Record<string, string> = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" };
  const intervalLabels: Record<string, string> = {
    engangskøb: "Engangskøb",
    ugentlig: "Ugentlig",
    hver_14_dag: "Hver 14. dag",
    månedlig: "Månedlig",
    kvartalsvis: "Kvartalsvis",
  };

  const intervals = service.interval_options || [];
  const hasRecurring = intervals.some((i: string) => i !== "engangskøb");
  const categoryIcon = industryIcon(service.service_category);
  const intervalSummary = intervals.length > 0
    ? intervals.slice(0, 2).map((interval: string) => intervalLabels[interval] || interval).join(", ") + (intervals.length > 2 ? ` +${intervals.length - 2}` : "")
    : "Ikke angivet";
  const priceSummary = service.base_price != null
    ? `${service.base_price} kr${service.unit ? ` / ${service.unit}` : ""}`
    : service.pricing_type === "prisberegner"
      ? `${service.calculator_steps?.length || 0} trin`
      : "Ikke angivet";

  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-2.5 p-3.5 sm:p-4">
          <div className="min-w-0">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                  <span className="text-sm leading-none">{categoryIcon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{service.name}</h3>
                    {service.service_category && (
                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {service.service_category}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{service.subcategory || "Standard service"}</span>
                    <span>•</span>
                    <span>{pricingLabels[service.pricing_type] || service.pricing_type}</span>
                    {hasRecurring && (
                      <>
                        <span>•</span>
                        <span>Abonnement muligt</span>
                      </>
                    )}
                  </div>

                  {service.is_active === false && (
                    <Badge variant="outline" className="mt-2 rounded-md border-destructive/30 px-2 py-0.5 text-[10px] text-destructive">Inaktiv</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:shrink-0">
                <Button variant="outline" size="sm" onClick={onEdit} className="h-8 rounded-lg border-border px-3 text-xs text-foreground hover:bg-secondary hover:text-foreground">
                  Rediger
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</p>
                <p className="mt-1 text-sm font-medium text-foreground truncate">{priceSummary}</p>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Interval</p>
                <p className="mt-1 text-sm font-medium text-foreground line-clamp-1">{intervalSummary}</p>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bestillinger</p>
                <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">{orderCount}</p>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Opsætning</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {service.calculator_steps?.length > 0 ? `${service.calculator_steps.length} beregnertrin` : "Standard opsætning"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Calculator Preview ─── */
const CalculatorPreview = ({ steps }: { steps: any[] }) => {
  const [values, setValues] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    steps.forEach((s, i) => { init[i] = parseFloat(s.default_value) || 0; });
    return init;
  });

  const total = steps.reduce((sum, step, i) => sum + (values[i] || 0) * (parseFloat(step.price_per_unit) || 0), 0);
  if (steps.length === 0) return null;

  return (
    <div className="surface-admin rounded-xl border border-border/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Calculator className="h-4 w-4" />
        Forhåndsvisning
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {steps.filter(s => s.label).map((step, idx) => {
          const stepTotal = (values[idx] || 0) * (parseFloat(step.price_per_unit) || 0);
          return (
            <div key={idx} className={`flex items-center justify-between gap-3 px-4 py-3 ${idx < steps.length - 1 ? "border-b border-border" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{step.label || "..."}</div>
                <div className="text-xs text-muted-foreground">{parseFloat(step.price_per_unit) || 0} kr / {step.unit || "stk"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
                  {values[idx] || 0} {step.unit || "stk"}
                </span>
                <span className="w-16 text-right text-sm font-semibold text-foreground">{stepTotal} kr</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between bg-secondary px-4 py-3">
          <span className="text-sm font-semibold text-foreground">I alt</span>
          <span className="text-lg font-bold text-foreground">{total} kr</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Service Form ─── */
const ServiceForm = ({
  businessId,
  businessIndustries = [],
  selectedSubcategoriesByIndustry = {},
  existingService,
  onClose,
}: {
  businessId: string;
  businessIndustries?: string[];
  selectedSubcategoriesByIndustry?: Record<string, string[]>;
  existingService?: any;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { data: business } = useMyBusiness();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const upsertSteps = useUpsertCalculatorSteps();

  const [currentStep, setCurrentStep] = useState(1);
  const [serviceCategory, setServiceCategory] = useState(existingService?.service_category || "");
  const [subcategory, setSubcategory] = useState(existingService?.subcategory || "");
  const [name, setName] = useState(existingService?.name || "");
  const [description, setDescription] = useState(existingService?.description || "");
  const [imageUrl, setImageUrl] = useState(existingService?.image_url || "");
  const [pricingType, setPricingType] = useState(existingService?.pricing_type || "fast_pris");
  const [basePrice, setBasePrice] = useState(existingService?.base_price?.toString() || "");
  const [unit, setUnit] = useState(existingService?.unit || "");
  const [steps, setSteps] = useState<any[]>(existingService?.calculator_steps || []);
  const [customCategory, setCustomCategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState(false);
  const [intervalOptions, setIntervalOptions] = useState<string[]>(
    existingService?.interval_options || ["engangskøb"]
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescAutoTried, setAiDescAutoTried] = useState(!!existingService?.description);

  const generateAiDescription = async () => {
    if (!name.trim()) {
      toast.error("Skriv først et servicenavn");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-service-description", {
        body: {
          serviceName: name.trim(),
          serviceCategory: serviceCategory || null,
          subcategory: subcategory || null,
          pricingType,
          businessName: business?.name || null,
          businessDescription: business?.description || null,
          businessCategories: Array.isArray(business?.categories) ? business?.categories : null,
          businessCity: business?.city || null,
          intervalOptions: Array.isArray(intervalOptions) ? intervalOptions : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = ((data as any)?.description ?? "").trim();
      if (!text) throw new Error("Tomt svar fra AI");
      setDescription(text);
      toast.success("AI-forslag indsat");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke generere forslag");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-foreslå AI-beskrivelse første gang brugeren rammer detaljer-trinnet
  // med navn + kategori valgt og tom beskrivelse.
  useEffect(() => {
    if (
      currentStep === 2 &&
      !existingService &&
      !aiDescAutoTried &&
      !aiLoading &&
      !description.trim() &&
      name.trim().length > 1 &&
      serviceCategory.trim().length > 0
    ) {
      // Lille forsinkelse så brugeren kan nå at se feltet være tomt og ikke føler at AI tager over
      const t = setTimeout(() => {
        setAiDescAutoTried(true);
        generateAiDescription();
      }, 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, name, serviceCategory]);

  const ALL_INTERVALS = [
    { value: "engangskøb", label: "Engangskøb" },
    { value: "ugentlig", label: "Ugentlig" },
    { value: "hver_14_dag", label: "Hver 14. dag" },
    { value: "månedlig", label: "Månedlig" },
    { value: "kvartalsvis", label: "Kvartalsvis" },
  ];

  const toggleInterval = (v: string) => {
    setIntervalOptions((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  // ── Branchefiltrering ──────────────────────────────────────────────
  // Vi viser kun kategorier/underkategorier/forslag som matcher virksomhedens
  // valgte brancher. Hvis der er en eksisterende service med en gammel/custom
  // kategori, beholder vi den så den ikke forsvinder fra valgmulighederne.
  const selectedIndustries = (businessIndustries || []).filter(Boolean);
  const hasIndustrySelection = selectedIndustries.length > 0;

  const matchedIndustries = selectedIndustries
    .map((k) => findIndustry(k))
    .filter((i): i is NonNullable<ReturnType<typeof findIndustry>> => !!i);

  // Kategorier = brancher fra taxonomien + evt. eksisterende kategori (legacy)
  const taxonomyCategoryKeys = matchedIndustries.map((i) => i.key);
  const legacyCategoryKeys = Object.keys(SERVICE_CATEGORIES).filter(
    (k) => selectedIndustries.includes(k) && !taxonomyCategoryKeys.includes(k),
  );
  const existingCategoryKey =
    existingService?.service_category &&
    !taxonomyCategoryKeys.includes(existingService.service_category) &&
    !legacyCategoryKeys.includes(existingService.service_category)
      ? [existingService.service_category]
      : [];
  const categoryOptions = hasIndustrySelection
    ? Array.from(new Set([...taxonomyCategoryKeys, ...legacyCategoryKeys, ...existingCategoryKey]))
    : Object.keys(SERVICE_CATEGORIES);

  // Underkategorier — først fra taxonomien, ellers fra legacy SERVICE_CATEGORIES
  const taxonomyIndustry = findIndustry(serviceCategory);
  // Hvis virksomheden har valgt specifikke underkategorier i Indstillinger,
  // filtrér så vi KUN viser dem her (giver præcis dynamisk filtrering).
  // Faldback: alle underkategorier i branchen.
  const allowedSubsForCategory = selectedSubcategoriesByIndustry[serviceCategory];
  const allTaxonomySubs = taxonomyIndustry?.subcategories.map((s) => s.label) ?? [];
  const filteredTaxonomySubs = allowedSubsForCategory && allowedSubsForCategory.length > 0
    ? allTaxonomySubs.filter((s) => allowedSubsForCategory.includes(s))
    : allTaxonomySubs;
  // Behold eksisterende underkategori, hvis service redigeres med en værdi
  // der ikke længere er i listen
  const subcategoryOptions = taxonomyIndustry
    ? Array.from(new Set([
        ...filteredTaxonomySubs,
        ...(existingService?.subcategory && filteredTaxonomySubs.length > 0 ? [existingService.subcategory] : []),
      ]))
    : serviceCategory && SERVICE_CATEGORIES[serviceCategory]
      ? Object.keys(SERVICE_CATEGORIES[serviceCategory])
      : [];

  // Service-forslag (navne) for valgt underkategori
  const taxonomySubcategory = taxonomyIndustry?.subcategories.find((s) => s.label === subcategory);
  const productSuggestions = taxonomySubcategory
    ? taxonomySubcategory.services
    : serviceCategory && subcategory && SERVICE_CATEGORIES[serviceCategory]?.[subcategory]
      ? SERVICE_CATEGORIES[serviceCategory][subcategory]
      : [];

  // Step-templates: brug den nye branche-baserede liste hvis branchen er kendt,
  // ellers fald tilbage til den lokale STEP_TEMPLATES (legacy keys).
  const taxonomyTemplates = serviceCategory ? stepTemplatesForIndustries([serviceCategory]) : [];
  const availableTemplates = taxonomyTemplates.length > 0
    ? taxonomyTemplates
    : (STEP_TEMPLATES[serviceCategory] || []);

  // ── Skabelon-rangering med altid-godt-foreslag ──────────────────────
  // 1) Tokeniser brugerens valg (underkategori + servicenavn) til søgeord.
  // 2) Score taxonomy-skabeloner efter overlap med både label OG step-labels.
  //    Det fanger fx "ovn" → "Flytterengøring" (har "Ovn rengøring" som trin).
  // 3) Tilføj ALTID generiske fallback-skabeloner (areal/timer/stk) der
  //    bygges dynamisk ud fra kategori-keywords, så brugeren aldrig står
  //    uden et fornuftigt forslag — selv ved custom kategorier.
  const haystack = `${subcategory || ""} ${name || ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scoreTemplate = (t: { label: string; steps: { label: string }[] }) => {
    if (haystack.length === 0) return 0;
    const text = `${t.label} ${t.steps.map((s) => s.label).join(" ")}`.toLowerCase();
    return haystack.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
  };

  // Generiske fallback-templates — altid relevante, men nedtonede når
  // taxonomien har specifikke forslag.
  const genericTemplates: typeof availableTemplates = (() => {
    const isAreaJob = /(rengør|maler|vask|polering|gulv|tag|facade|isoler|haveservice|græs|areal)/i.test(
      `${serviceCategory} ${subcategory} ${name}`,
    );
    const isHourly = /(reparation|installation|montering|vvs|elektrik|tømrer|smed|service|hjælp)/i.test(
      `${serviceCategory} ${subcategory} ${name}`,
    );
    const list: typeof availableTemplates = [];
    if (isAreaJob) {
      list.push({
        label: "Areal-baseret pris",
        steps: [
          { label: "Antal m²", unit: "m²", price_per_unit: 12, min_value: 10, max_value: 500, default_value: 50 },
          { label: "Tillægsarbejde", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 10, default_value: 0 },
        ],
      });
    }
    if (isHourly || (!isAreaJob && availableTemplates.length === 0)) {
      list.push({
        label: "Timebaseret med materialer",
        steps: [
          { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 20, default_value: 2 },
          { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
          { label: "Kørsel", unit: "km", price_per_unit: 8, min_value: 0, max_value: 100, default_value: 10 },
        ],
      });
    }
    if (list.length === 0) {
      // Allersidste fallback: en simpel "antal × pris" beregner.
      list.push({
        label: "Antal × pris",
        steps: [
          { label: "Antal", unit: "stk", price_per_unit: 100, min_value: 1, max_value: 50, default_value: 1 },
        ],
      });
    }
    return list;
  })();

  // Saml + dedup på label, sorter på score (taxonomy vinder ved lige score).
  const allTemplates = [...availableTemplates, ...genericTemplates].filter(
    (t, i, arr) => arr.findIndex((x) => x.label === t.label) === i,
  );
  const rankedTemplates = allTemplates
    .map((t, i) => ({
      t,
      score: scoreTemplate(t),
      // Taxonomy-skabeloner ranker over generiske ved samme score
      isGeneric: genericTemplates.includes(t),
      i,
    }))
    .sort((a, b) => b.score - a.score || Number(a.isGeneric) - Number(b.isGeneric) || a.i - b.i)
    .map((s) => s.t);

  const bestTemplate = rankedTemplates[0];
  const isBestMatch = !!(bestTemplate && rankedTemplates.length > 1 &&
    (subcategory || name).trim().length > 2 && scoreTemplate(bestTemplate) > 0);

  const totalSteps = 4;
  const FORM_STEPS = [
    { num: 1, label: "Kategori", color: "bg-blue-500" },
    { num: 2, label: "Detaljer", color: "bg-violet-500" },
    { num: 3, label: "Pris", color: "bg-emerald-500" },
    { num: 4, label: "Interval", color: "bg-cyan-500" },
  ];

  const addStep = () => {
    setSteps([...steps, { label: "", unit: "stk", price_per_unit: 0, min_value: 0, max_value: 100, default_value: 0, sort_order: steps.length }]);
  };
  const updateStep = (i: number, field: string, value: any) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: value };
    setSteps(updated);
  };
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const applyTemplate = (template: typeof availableTemplates[number]) => {
    setSteps(template.steps.map((s, i) => ({ ...s, sort_order: i })));
    toast.success(`Skabelon "${template.label}" anvendt`);
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!serviceCategory;
    if (currentStep === 2) return !!name.trim();
    if (currentStep === 3) {
      if (pricingType === "prisberegner") return true;
      return true;
    }
    return true;
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Indtast et servicenavn"); return; }
    if (!serviceCategory.trim()) { toast.error("Vælg en kategori"); return; }
    if (pricingType === "prisberegner" && steps.length === 0) { toast.error("Tilføj mindst ét beregnertrin"); return; }
    if (pricingType === "prisberegner" && steps.some(s => !s.label.trim())) { toast.error("Alle beregnertrin skal have et navn"); return; }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        pricing_type: pricingType as any,
        base_price: basePrice ? parseFloat(basePrice) : null,
        unit: unit || null,
        subcategory: subcategory.trim() || null,
        service_category: serviceCategory.trim() || null,
        image_url: imageUrl || null,
        interval_options: intervalOptions.length > 0 ? intervalOptions : ["engangskøb"],
      };

      if (existingService) {
        await updateService.mutateAsync({ id: existingService.id, ...payload } as any);
        if (pricingType === "prisberegner") {
          await upsertSteps.mutateAsync({
            serviceId: existingService.id,
            steps: steps.map((s, i) => ({
              service_id: existingService.id, label: s.label, unit: s.unit,
              price_per_unit: parseFloat(s.price_per_unit) || 0,
              min_value: parseFloat(s.min_value) || 0,
              max_value: parseFloat(s.max_value) || 100,
              default_value: parseFloat(s.default_value) || 0, sort_order: i,
            })),
          });
        }
        toast.success("Service opdateret");
      } else {
        const result = await createService.mutateAsync({ business_id: businessId, ...payload } as any);
        if (pricingType === "prisberegner" && steps.length > 0) {
          await upsertSteps.mutateAsync({
            serviceId: result.id,
            steps: steps.map((s, i) => ({
              service_id: result.id, label: s.label, unit: s.unit,
              price_per_unit: parseFloat(s.price_per_unit) || 0,
              min_value: parseFloat(s.min_value) || 0,
              max_value: parseFloat(s.max_value) || 100,
              default_value: parseFloat(s.default_value) || 0, sort_order: i,
            })),
          });
        }
        toast.success("Service oprettet");
      }
      onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  const CATEGORY_ICONS: Record<string, string> = {
    "Rengøring": "🧹", "Håndværker": "🔨", "Flyttehjælp": "📦", "Haveservice": "🌿",
    "Maler": "🎨", "VVS": "🔧", "Elektriker": "⚡", "Sikkerhed": "🔒",
  };

  return (
    <div className="space-y-6">
      {/* Step Progress Bar — kompakt, tydelig nuværende fase + lille hint
          om hvad der mangler i alt. */}
      <div className="surface-admin rounded-xl border border-border/80 p-3 sm:p-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trin {currentStep} af {totalSteps}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {FORM_STEPS[currentStep - 1]?.label}
            </p>
          </div>
          {/* Live opsummering af brugerens valg så de altid kan se hvor de er */}
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5">
            {serviceCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                <span>{CATEGORY_ICONS[serviceCategory] || "📋"}</span>
                {serviceCategory}
              </span>
            )}
            {subcategory && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                {subcategory}
              </span>
            )}
            {name.trim() && currentStep > 2 && (
              <span className="max-w-[180px] truncate rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                {name.trim()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {FORM_STEPS.map((s, i) => {
            const isLast = i === FORM_STEPS.length - 1;
            const isDone = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div key={s.num} className={`flex items-center ${isLast ? "shrink-0" : "flex-1"}`}>
                <button
                  type="button"
                  onClick={() => { if (s.num <= currentStep || canGoNext()) setCurrentStep(s.num); }}
                  className="group flex shrink-0 items-center gap-2"
                  title={s.label}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isCurrent ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/15" :
                    isDone ? "bg-foreground/90 text-background" : "bg-secondary text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : s.num}
                  </span>
                </button>
                {!isLast && (
                  <div className={`mx-2 h-0.5 flex-1 min-w-4 rounded-full transition-colors ${
                    FORM_STEPS[i + 1].num <= currentStep ? "bg-foreground/60" : "bg-border"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Category — Card grid instead of dropdown */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Vælg kategori</h4>
            <p className="mt-1 text-sm text-muted-foreground">Hvilken type service tilbyder du?</p>
          </div>

          {!customCategory ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {categoryOptions.map((c) => (
                  <button key={c} type="button"
                    onClick={() => { setServiceCategory(c); setSubcategory(""); setCustomSubcategory(false); }}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors ${
                      serviceCategory === c
                        ? "border-border bg-secondary"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{CATEGORY_ICONS[c] || "📋"}</span>
                    <span className="text-sm font-medium text-foreground">{c}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setCustomCategory(true); setServiceCategory(""); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                + Skriv din egen kategori
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Fx Vinduespolering" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="bg-card" />
              <button type="button" onClick={() => { setCustomCategory(false); setServiceCategory(""); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                ← Vælg fra listen
              </button>
            </div>
          )}

          {/* Subcategory — chips instead of dropdown */}
          {serviceCategory && subcategoryOptions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Underkategori</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">Vælg den mest passende underkategori</p>
              </div>
              {!customSubcategory ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {subcategoryOptions.map((s) => (
                      <button key={s} type="button" onClick={() => setSubcategory(s)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          subcategory === s
                            ? "border-border bg-secondary text-foreground"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setCustomSubcategory(true); setSubcategory(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    + Skriv din egen
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-card" />
                  <button type="button" onClick={() => { setCustomSubcategory(false); setSubcategory(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    ← Vælg fra listen
                  </button>
                </div>
              )}
            </div>
          )}

          {serviceCategory && subcategoryOptions.length === 0 && !customCategory && (
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Underkategori (valgfrit)</label>
              <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-card" />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Service detaljer</h4>
            <p className="mt-1 text-sm text-muted-foreground">Beskriv din service så kunderne ved hvad de får</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Servicenavn</label>
            <Input placeholder="Fx Rengøring af kontor" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-11 text-base" />
            {productSuggestions.length > 0 && !name && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground mr-1">Forslag:</span>
                {productSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-foreground">Beskrivelse</label>
              <button
                type="button"
                onClick={generateAiDescription}
                disabled={aiLoading || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                title={!name.trim() ? "Skriv et servicenavn først" : "Generér forslag baseret på din virksomhed"}
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {aiLoading ? "Genererer…" : "Foreslå med AI"}
              </button>
            </div>
            <Textarea placeholder="Hvad inkluderer denne service? Hvad kan kunden forvente?" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card" rows={3} />
            <p className="mt-1 text-[11px] text-muted-foreground">AI bruger din virksomheds navn, branche og beskrivelse til at skræddersy forslaget.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Billede (valgfrit)</label>
            <ImageUpload folder={`${user!.id}/services`} currentUrl={imageUrl || null} onUploaded={setImageUrl} label="" aspectRatio="aspect-video" className="w-40" />
          </div>
        </div>
      )}

      {/* Step 3: Pricing — big cards */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Hvordan vil du prissætte?</h4>
            <p className="mt-1 text-sm text-muted-foreground">Vælg den prismodel der passer bedst til din service</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: "fast_pris", label: "Fast pris", desc: "Kunden betaler én fast pris for hele servicen", icon: "💰" },
              { value: "timepris", label: "Timepris", desc: "Kunden betaler pr. time brugt på opgaven", icon: "⏱️" },
              { value: "prisberegner", label: "Prisberegner", desc: "Kunden sammensætter selv og ser prisen live", icon: "🧮" },
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => setPricingType(opt.value)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  pricingType === opt.value
                    ? "border-border bg-secondary"
                    : "border-border bg-card hover:bg-secondary"
                }`}>
                <span className="text-2xl">{opt.icon}</span>
                <span className="mt-2 block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground leading-snug">{opt.desc}</span>
              </button>
            ))}
          </div>

          {(pricingType === "fast_pris" || pricingType === "timepris") && (
            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {pricingType === "fast_pris" ? "Pris (kr)" : "Timepris (kr)"}
                </label>
                <Input type="number" placeholder="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="bg-card h-11 text-base" />
              </div>
              {pricingType === "timepris" && (
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Enhed</label>
                  <Input placeholder="Fx timer" value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-card h-11 text-base" />
                </div>
              )}
            </div>
          )}

          {pricingType === "prisberegner" && (
            <div className="space-y-5 pt-2">
              <div>
                <h4 className="text-base font-semibold text-foreground">Opsæt prisberegner</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vælg en skabelon der passer til din service — eller byg trinnene manuelt.
                </p>
              </div>

              {rankedTemplates.length > 0 && (
                <div className="surface-admin rounded-xl border border-border/80 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        {steps.length === 0 ? "Foreslåede skabeloner" : "Skift skabelon"}
                      </span>
                    </div>
                    {subcategory && (
                      <span className="text-[11px] text-muted-foreground">
                        Tilpasset {subcategory}
                      </span>
                    )}
                  </div>
                  {steps.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Skabelonerne er sorteret efter hvad der bedst matcher{" "}
                      <span className="font-medium text-foreground">
                        {[subcategory, name.trim()].filter(Boolean).join(" · ") || serviceCategory}
                      </span>
                      . Du kan finjustere alle priser bagefter.
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rankedTemplates.map((t, idx) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={`group relative rounded-xl border p-4 text-left transition-colors ${
                          idx === 0 && isBestMatch
                            ? "border-foreground bg-card hover:bg-secondary"
                            : "border-border bg-card hover:bg-secondary"
                        }`}
                      >
                        {idx === 0 && isBestMatch && (
                          <span className="absolute -top-2 left-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
                            Bedste match
                          </span>
                        )}
                        <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {t.steps.length} trin · {Array.from(new Set(t.steps.map((s) => s.unit))).join(", ")}
                        </span>
                        <span className="mt-2 block text-xs text-muted-foreground/80 line-clamp-2">
                          {t.steps.slice(0, 3).map((s) => s.label).join(" · ")}
                          {t.steps.length > 3 ? " …" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{steps.length} beregnertrin</span>
              <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5 rounded-lg">
                <Plus className="h-3.5 w-3.5" /> Tilføj trin
              </Button>
            </div>

            {steps.map((step, i) => (
              <Card key={i} className="rounded-xl shadow-sm border-border overflow-hidden">
                <div className="flex items-center justify-between bg-secondary/40 px-4 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[11px] font-bold text-background">{i + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{step.label || `Trin ${i + 1}`}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Navn</label>
                      <Input placeholder="Fx Støvsugning" value={step.label} onChange={(e) => updateStep(i, "label", e.target.value)} className="bg-card" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Enhed</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"].map((u) => (
                          <button key={u} type="button" onClick={() => updateStep(i, "unit", u)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                              step.unit === u
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                            }`}>{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: `Pris / ${step.unit || "enhed"}`, field: "price_per_unit", value: step.price_per_unit },
                      { label: "Min", field: "min_value", value: step.min_value },
                      { label: "Max", field: "max_value", value: step.max_value },
                      { label: "Standard", field: "default_value", value: step.default_value },
                    ].map((f) => (
                      <div key={f.field}>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                        <Input type="number" placeholder="0" value={f.value} onChange={(e) => updateStep(i, f.field, e.target.value)} className="bg-card text-sm" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {steps.length === 0 && (
              <div className="py-10 text-center rounded-xl border border-dashed border-border bg-card">
                <Calculator className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {rankedTemplates.length > 0
                    ? "Vælg en skabelon ovenfor — eller tryk \"Tilføj trin\" for at bygge selv."
                    : "Tryk \"Tilføj trin\" for at oprette dit første beregnertrin."}
                </p>
              </div>
            )}
          </div>

          <CalculatorPreview steps={steps} />
            </div>
          )}
        </div>
      )}

      {/* Step: Interval */}
      {currentStep === totalSteps && (
        <div className="space-y-5">
          <div>
            <h4 className="text-base font-semibold text-foreground">Vælg intervaller</h4>
            <p className="mt-1 text-sm text-muted-foreground">Hvilke intervaller kan kunden vælge for denne service?</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_INTERVALS.map((iv) => (
              <button key={iv.value} type="button" onClick={() => toggleInterval(iv.value)}
                className={`rounded-xl border px-4 py-3 text-center transition-colors ${
                  intervalOptions.includes(iv.value)
                    ? "border-border bg-secondary"
                    : "border-border bg-card hover:bg-secondary"
                }`}>
                <span className="text-sm font-medium text-foreground">{iv.label}</span>
              </button>
            ))}
          </div>
          {intervalOptions.length === 0 && (
            <p className="text-sm text-destructive">Vælg mindst ét interval</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="rounded-lg h-10 px-4 text-sm font-medium">
              ← Tilbage
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="rounded-lg h-10 px-4 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:text-foreground">
            Annuller
          </Button>
        </div>
        <div>
          {currentStep < totalSteps ? (
            <Button onClick={() => { if (canGoNext()) setCurrentStep(currentStep + 1); else toast.error("Udfyld venligst de påkrævede felter"); }}
              disabled={!canGoNext()}
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground h-10 px-6 text-sm font-semibold shadow-sm">
              Næste →
            </Button>
          ) : (
            <Button onClick={handleSave} className="rounded-lg bg-foreground text-background hover:bg-foreground/90 h-10 px-6 text-sm font-semibold shadow-sm">
              {existingService ? "Gem ændringer" : "Opret service"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};


export default Admin;
