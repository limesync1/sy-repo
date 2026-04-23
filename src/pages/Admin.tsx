import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders, useCreateBusiness, useCreateService,
  useUpdateService, useDeleteService, useUpdateBusiness,
  useUpsertCalculatorSteps, useReviews,
} from "@/hooks/useDatabase";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import {
  Plus, Trash2, LogOut,
  Sparkles, Calculator, LayoutDashboard, Wrench, ShoppingCart,
  Star, Settings, Menu, X, ExternalLink, Bell, Users, Route, Contact, ChevronRight,
  CheckCircle2, MapPin, FolderTree, Clock3, Eye, Filter,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import DashboardTab from "@/components/admin/DashboardTab";
import ReviewsTab from "@/components/admin/ReviewsTab";
import AftaleTab from "@/components/admin/AftaleTab";
import EmployeesTab from "@/components/admin/EmployeesTab";
import CustomersTab from "@/components/admin/CustomersTab";
import { PageHeader, PrimaryButton, SectionCard, FieldLabel, EmptyState, AppList, AppListRow, InsightPill, SearchInput, StatCard } from "@/components/admin/shared/AdminUI";

/* ─── Constants ─── */
const CATEGORIES = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS", "Elektriker", "Sikkerhed"];

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

const NAV_ITEMS = [
  { value: "dashboard", label: "Overblik", icon: LayoutDashboard, section: "Overblik" },
  { value: "orders", label: "Aftaler", icon: ShoppingCart, section: "Drift" },
  { value: "customers", label: "Kunder", icon: Contact, section: "Drift" },
  { value: "routes", label: "Ruter", icon: Route, section: "Drift", requiresRoutePlanning: true, href: "/virksomhed/ruter" as string | undefined },
  { value: "employees", label: "Medarbejdere", icon: Users, section: "Drift", requiresRoutePlanning: true },
  { value: "services", label: "Services", icon: Wrench, section: "Forretning" },
  { value: "reviews", label: "Anmeldelser", icon: Star, section: "Forretning" },
  { value: "settings", label: "Indstillinger", icon: Settings, section: "Opsætning" },
];

/* ─── Entry ─── */
const Admin = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/log-ind" replace />;
  return <AdminDashboard />;
};

/* ─── Main Dashboard ─── */
const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { data: business, isLoading } = useMyBusiness();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!business) return <CreateBusinessForm />;

  const routePlanningEnabled = !!(business.settings as any)?.route_planning_enabled;
  const visibleNav = NAV_ITEMS.filter((n) => !n.requiresRoutePlanning || routePlanningEnabled);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardWrapper business={business} onNavigate={setActiveTab} />;
      case "services": return <ServicesTab businessId={business.id} />;
      case "orders": return <AftaleTab businessId={business.id} businessName={business.name} />;
      case "customers": return <CustomersTab businessId={business.id} businessName={business.name} />;
      case "employees": return <EmployeesTab businessId={business.id} businessName={business.name} routePlanningEnabled={routePlanningEnabled} />;
      case "reviews": return <ReviewsWrapper businessId={business.id} />;
      case "settings": return <SettingsTab business={business} />;
      default: return null;
    }
  };

  const currentNav = visibleNav.find(n => n.value === activeTab) || NAV_ITEMS.find(n => n.value === activeTab);
  const navGroups = visibleNav.reduce<Record<string, typeof visibleNav>>((acc, item) => {
    const key = item.section || "Andet";
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});
  const currentSectionItems = currentNav?.section ? navGroups[currentNav.section] || [] : [];

  return (
    <div className="admin-shell flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-6" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-white/50 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business info */}
        <div className="mx-3 mb-2 shrink-0 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain bg-white/10 p-1" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/8 text-sm font-bold text-white">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{business.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/40">Virksomhedspanel</p>
              {business.categories && business.categories.length > 0 && <p className="mt-1.5 truncate text-[11px] text-white/55">{(business.categories as string[]).slice(0, 2).join(" · ")}</p>}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {Object.entries(navGroups).map(([section, items]) => (
            <div key={section} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{section}</p>
              {items.map((item: any) => {
                const isActive = activeTab === item.value;
                const baseClasses = `group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-foreground shadow-sm"
                    : "text-white/62 hover:bg-white/[0.035] hover:text-white"
                }`;
                if (item.href) {
                  return (
                    <Link key={item.value} to={item.href} onClick={() => setSidebarOpen(false)} className={baseClasses}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.value}
                    onClick={() => { setActiveTab(item.value); setSidebarOpen(false); }}
                    className={baseClasses}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer — always visible */}
        <div className="shrink-0 border-t border-white/[0.08] px-3 py-2.5 space-y-1">
          <Link
            to={`/v/${business.slug}`}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Se din side
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-destructive/20 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log ud
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/96 px-4 backdrop-blur sm:px-5">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{currentNav?.section || "Panel"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground sm:text-[15px]">{currentNav?.label}</h1>
              {currentSectionItems.length > 1 && (
                <div className="hidden items-center gap-1 rounded-md border border-border bg-secondary/45 px-1 py-1 md:flex">
                  {currentSectionItems.map((item) => {
                    const isCurrent = item.value === activeTab;
                    const labelClasses = isCurrent
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground";

                    if (item.href) {
                      return (
                          <Link key={item.value} to={item.href} className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${labelClasses}`}>
                          {item.label}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.value}
                        onClick={() => setActiveTab(item.value)}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${labelClasses}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
              <Link to={`/v/${business.slug}`} className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
              Se virksomhedsside
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
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

  const CATEGORY_ICONS: Record<string, string> = {
    "Rengøring": "🧹", "Håndværker": "🔨", "Flyttehjælp": "📦", "Haveservice": "🌿",
    "Maler": "🎨", "VVS": "🔧", "Elektriker": "⚡", "Sikkerhed": "🔒",
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => toggleCategory(c)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                    selectedCategories.includes(c)
                      ? "border-foreground bg-foreground/5 shadow-sm"
                      : "border-border bg-card hover:border-foreground/30"
                  }`}>
                  <span className="text-xl">{CATEGORY_ICONS[c] || "📋"}</span>
                  <span className="text-xs font-medium text-foreground">{c}</span>
                </button>
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
const ServicesTab = ({ businessId }: { businessId: string }) => {
  const { data: services, isLoading } = useServices(businessId);
  const { data: orders } = useOrders(businessId);
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

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

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser services...</p>;

  return (
    <div className="space-y-4.5">
      <PageHeader
        eyebrow="Forretning"
        title="Services"
        description={`${services?.length || 0} services · ${Object.values(orderCountByService).reduce((a, b) => a + b, 0)} bestillinger i alt`}
        action={
          <PrimaryButton onClick={() => setShowForm(true)} icon={<Plus />}>
            Tilføj service
          </PrimaryButton>
        }
      />

      {/* Category filter chips */}
      {uniqueCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-card p-1">
          <button onClick={() => setFilterCategory("")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${!filterCategory ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            Alle
          </button>
          {uniqueCategories.map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${filterCategory === cat ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="rounded-md border-border shadow-sm">
          <CardContent className="p-3.5 sm:p-4">
            <ServiceForm businessId={businessId} onClose={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2.5">
        {filtered && filtered.length > 0 && (
          <AppList>
            <div className="grid grid-cols-[minmax(0,1.4fr)_auto_auto] gap-3 border-b border-border bg-secondary/35 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>Service</span>
              <span>Type</span>
              <span className="text-right">Pris</span>
            </div>
            {filtered.map((s: any) => (
              <ServiceRow key={s.id} service={s} orderCount={orderCountByService[s.id] || 0} onDelete={() => deleteService.mutate(s.id)} />
            ))}
          </AppList>
        )}
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

const ServiceRow = ({ service, orderCount, onDelete }: { service: any; orderCount: number; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const pricingLabels: Record<string, string> = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" };

  const intervals = service.interval_options || [];
  const hasRecurring = intervals.some((i: string) => i !== "engangskøb");

  return (
    <div className="border-b border-border/80 last:border-b-0">
      <AppListRow className="items-start gap-4 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{service.name}</h3>
            {service.is_active === false && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border bg-background text-muted-foreground">Inaktiv</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {[service.service_category, service.subcategory].filter(Boolean).join(" · ") || "Ingen kategori valgt"}
          </p>
          {service.description && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{service.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {service.calculator_steps?.length > 0 && (
              <InsightPill><Calculator className="h-3 w-3" /> {service.calculator_steps.length} trin</InsightPill>
            )}
            {hasRecurring && <InsightPill>Abonnement muligt</InsightPill>}
            <InsightPill>{orderCount} bestillinger</InsightPill>
          </div>
        </div>
        <div className="hidden min-w-[120px] flex-col items-start gap-1 sm:flex">
          <span className="text-xs font-medium text-foreground">{pricingLabels[service.pricing_type] || service.pricing_type}</span>
          <span className="text-[11px] text-muted-foreground">{service.unit || "Fast enhed"}</span>
        </div>
        <div className="flex min-w-[148px] flex-col items-end gap-2">
          <div className="text-right">
            <span className="text-sm font-semibold text-foreground">{service.base_price != null ? `${service.base_price} kr` : "Variabel pris"}</span>
            <p className="text-[11px] text-muted-foreground">{service.unit ? `pr. ${service.unit}` : "pris efter opsætning"}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="h-7 rounded-md px-2.5 text-xs">
              {editing ? "Luk" : "Rediger"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 rounded-md p-0 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </div>
      </AppListRow>
      {editing && (
          <div className="border-t border-border bg-secondary/18 p-3.5">
          <ServiceForm businessId={service.business_id} existingService={service} onClose={() => setEditing(false)} />
        </div>
      )}
    </div>
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
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
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
        <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">I alt</span>
          <span className="text-lg font-bold text-accent">{total} kr</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Service Form ─── */
const ServiceForm = ({ businessId, existingService, onClose }: { businessId: string; existingService?: any; onClose: () => void }) => {
  const { user } = useAuth();
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

  const categoryOptions = Object.keys(SERVICE_CATEGORIES);
  const subcategoryOptions = serviceCategory && SERVICE_CATEGORIES[serviceCategory]
    ? Object.keys(SERVICE_CATEGORIES[serviceCategory]) : [];
  const productSuggestions = serviceCategory && subcategory && SERVICE_CATEGORIES[serviceCategory]?.[subcategory]
    ? SERVICE_CATEGORIES[serviceCategory][subcategory] : [];
  const availableTemplates = STEP_TEMPLATES[serviceCategory] || [];

  const totalSteps = pricingType === "prisberegner" ? 5 : 4;
  const FORM_STEPS = [
    { num: 1, label: "Kategori", color: "bg-blue-500" },
    { num: 2, label: "Detaljer", color: "bg-violet-500" },
    { num: 3, label: "Pris", color: "bg-emerald-500" },
    ...(pricingType === "prisberegner" ? [{ num: 4, label: "Beregner", color: "bg-amber-500" }] : []),
    { num: pricingType === "prisberegner" ? 5 : 4, label: "Interval", color: "bg-cyan-500" },
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
      {/* Step Progress Bar */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center">
          {FORM_STEPS.map((s, i) => {
            const isLast = i === FORM_STEPS.length - 1;
            return (
              <div key={s.num} className={`flex items-center ${isLast ? "shrink-0" : "flex-1"}`}>
                <button
                  onClick={() => { if (s.num <= currentStep || canGoNext()) setCurrentStep(s.num); }}
                  className="group flex shrink-0 items-center gap-2"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    currentStep === s.num ? "bg-foreground text-background shadow-sm ring-2 ring-foreground/20" :
                    s.num < currentStep ? "bg-accent/15 text-accent ring-1 ring-accent/30" : "bg-secondary text-muted-foreground"
                  }`}>
                    {s.num < currentStep ? "✓" : s.num}
                  </span>
                  <span className={`hidden sm:block text-sm font-medium whitespace-nowrap transition-colors ${
                    currentStep === s.num ? "text-foreground" : s.num < currentStep ? "text-accent" : "text-muted-foreground"
                  }`}>{s.label}</span>
                </button>
                {!isLast && (
                  <div className={`mx-2 sm:mx-3 h-px flex-1 min-w-4 transition-colors ${FORM_STEPS[i + 1].num <= currentStep ? "bg-accent/40" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Category */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Kategori</h4>
            <p className="mt-1 text-xs text-muted-foreground">Vælg den kategori, der bedst beskriver servicen.</p>
          </div>

          {!customCategory ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categoryOptions.map((c) => (
                  <button key={c} type="button"
                    onClick={() => { setServiceCategory(c); setSubcategory(""); setCustomSubcategory(false); }}
                    className={`flex items-center justify-center rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors ${
                      serviceCategory === c
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-foreground">{c}</span>
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
                  <p className="mt-0.5 text-xs text-muted-foreground">Vælg den mest præcise underkategori.</p>
              </div>
              {!customSubcategory ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {subcategoryOptions.map((s) => (
                      <button key={s} type="button" onClick={() => setSubcategory(s)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          subcategory === s
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:border-foreground/40"
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
            <h4 className="text-sm font-semibold text-foreground">Detaljer</h4>
            <p className="mt-1 text-xs text-muted-foreground">Beskriv servicen kort og præcist.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Servicenavn</label>
            <Input placeholder="Fx Rengøring af kontor" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-10" />
            {productSuggestions.length > 0 && !name && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground mr-1">Forslag:</span>
                {productSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Beskrivelse</label>
            <Textarea placeholder="Hvad inkluderer denne service? Hvad kan kunden forvente?" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card" rows={3} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Billede (valgfrit)</label>
            <ImageUpload folder={`${user!.id}/services`} currentUrl={imageUrl || null} onUploaded={setImageUrl} label="" aspectRatio="aspect-video" className="w-40" />
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Pris</h4>
            <p className="mt-1 text-xs text-muted-foreground">Vælg den prismodel der passer bedst til servicen.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "fast_pris", label: "Fast pris", desc: "Én fast pris for hele servicen" },
              { value: "timepris", label: "Timepris", desc: "Pris pr. time" },
              { value: "prisberegner", label: "Prisberegner", desc: "Pris ud fra kundens valg" },
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => setPricingType(opt.value)}
                className={`rounded-lg border p-3.5 text-left transition-colors ${
                  pricingType === opt.value
                    ? "border-foreground bg-secondary"
                    : "border-border bg-card hover:border-foreground/30"
                }`}>
                <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground leading-5">{opt.desc}</span>
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
        </div>
      )}

      {/* Step 4: Calculator */}
      {currentStep === 4 && pricingType === "prisberegner" && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Prisberegner</h4>
            <p className="mt-1 text-xs text-muted-foreground">Tilføj de trin kunden bruger til at beregne prisen.</p>
          </div>

          {availableTemplates.length > 0 && steps.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Kom hurtigt i gang med en skabelon</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableTemplates.map((t) => (
                  <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:border-foreground/30">
                    <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t.steps.length} trin · {t.steps.map(s => s.unit).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</span>
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
              <Card key={i} className="rounded-lg border-border overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-[11px] font-bold text-foreground">{i + 1}</span>
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
                  {availableTemplates.length > 0 ? "Vælg en skabelon ovenfor eller tilføj trin manuelt." : "Tilføj trin for at oprette din prisberegner."}
                </p>
              </div>
            )}
          </div>

          <CalculatorPreview steps={steps} />
        </div>
      )}

      {/* Step: Interval */}
      {currentStep === totalSteps && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Intervaller</h4>
            <p className="mt-1 text-xs text-muted-foreground">Vælg hvilke intervaller kunden kan bestille.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_INTERVALS.map((iv) => (
              <button key={iv.value} type="button" onClick={() => toggleInterval(iv.value)}
                className={`rounded-lg border px-4 py-2.5 text-center transition-colors ${
                  intervalOptions.includes(iv.value)
                    ? "border-foreground bg-secondary"
                    : "border-border bg-card hover:border-foreground/30"
                }`}>
                <span className="text-xs font-medium text-foreground">{iv.label}</span>
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
          <Button variant="ghost" onClick={onClose} className="rounded-lg h-10 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
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
            <Button onClick={handleSave} className="rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-6 text-sm font-semibold shadow-sm">
              {existingService ? "Gem ændringer" : "✓ Opret service"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};




/* ─── Settings Tab ─── */
const SettingsTab = ({ business }: { business: any }) => {
  const updateBiz = useUpdateBusiness();
  const { user } = useAuth();
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [email, setEmail] = useState(business.email || "");
  const [address, setAddress] = useState(business.address || "");
  const [city, setCity] = useState(business.city || "");
  const [zipCode, setZipCode] = useState(business.zip_code || "");
  const [logoUrl, setLogoUrl] = useState(business.logo_url || "");
  const [coverUrl, setCoverUrl] = useState(business.cover_image_url || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    (business.categories as string[]) || (business.category ? [business.category] : [])
  );
  const [openHours, setOpenHours] = useState<Record<string, string>>(business.opening_hours || {});
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    new_order: true,
    upcoming_service: true,
    subscription_change: true,
    new_review: false,
    ...(business.notification_settings as Record<string, boolean> || {}),
  });
  const [routePlanningEnabled, setRoutePlanningEnabled] = useState<boolean>(
    !!(business.settings as any)?.route_planning_enabled
  );

  // CVR lookup
  const [cvrQuery, setCvrQuery] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrResult, setCvrResult] = useState<any>(null);
  const [cvrError, setCvrError] = useState("");

  // Zip code auto-fill city
  const [zipLoading, setZipLoading] = useState(false);

  const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
  const CATEGORY_ICONS: Record<string, string> = {
    "Rengøring": "🧹", "Håndværker": "🔨", "Flyttehjælp": "📦", "Haveservice": "🌿",
    "Maler": "🎨", "VVS": "🔧", "Elektriker": "⚡", "Sikkerhed": "🔒",
  };

  const toggleSettingsCategory = (c: string) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const lookupCvr = async () => {
    const q = cvrQuery.trim();
    if (!q) return;
    setCvrLoading(true);
    setCvrError("");
    setCvrResult(null);
    try {
      const isNumber = /^\d+$/.test(q);
      const url = isNumber
        ? `https://cvrapi.dk/api?vat=${q}&country=dk`
        : `https://cvrapi.dk/api?name=${encodeURIComponent(q)}&country=dk`;
      const res = await fetch(url, { headers: { "User-Agent": "Serviceydere/1.0" } });
      if (!res.ok) throw new Error("Ikke fundet");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCvrResult(data);
    } catch (e: any) {
      setCvrError(e.message || "Kunne ikke finde virksomheden");
    }
    setCvrLoading(false);
  };

  const applyCvrData = () => {
    if (!cvrResult) return;
    if (cvrResult.name) setName(cvrResult.name);
    if (cvrResult.phone) setPhone(cvrResult.phone.replace(/\s/g, ""));
    if (cvrResult.email) setEmail(cvrResult.email);
    if (cvrResult.address) setAddress(cvrResult.address);
    if (cvrResult.city) setCity(cvrResult.city);
    if (cvrResult.zipcode) setZipCode(cvrResult.zipcode.toString());
    toast.success("Oplysninger udfyldt fra CVR");
    setCvrResult(null);
    setCvrQuery("");
  };

  const handleZipChange = async (val: string) => {
    setZipCode(val);
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      setZipLoading(true);
      try {
        const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${val}`);
        if (res.ok) {
          const data = await res.json();
          if (data.navn) setCity(data.navn);
        }
      } catch {}
      setZipLoading(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/[^\d+]/g, "");
    setPhone(cleaned);
  };

  const save = () => {
    updateBiz.mutate({
      id: business.id, name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null, email: email.trim() || null,
      address: address.trim() || null, city: city.trim() || null,
      zip_code: zipCode.trim() || null,
      logo_url: logoUrl || null, cover_image_url: coverUrl || null,
      category: selectedCategories[0] || null,
      categories: selectedCategories,
      opening_hours: openHours,
      notification_settings: notifSettings,
      settings: {
        ...((business.settings as any) || {}),
        route_planning_enabled: routePlanningEnabled,
      },
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt"),
      onError: (e) => toast.error(e.message),
    });
  };

  const origCategories = (business.categories as string[]) || (business.category ? [business.category] : []);
  const origNotif = business.notification_settings as Record<string, boolean> || {};
  const origRoutePlanning = !!(business.settings as any)?.route_planning_enabled;
  const hasChanges = name !== business.name || description !== (business.description || "") ||
    phone !== (business.phone || "") || email !== (business.email || "") ||
    address !== (business.address || "") || city !== (business.city || "") ||
    zipCode !== (business.zip_code || "") || logoUrl !== (business.logo_url || "") ||
    coverUrl !== (business.cover_image_url || "") ||
    JSON.stringify([...selectedCategories].sort()) !== JSON.stringify([...origCategories].sort()) ||
    JSON.stringify(openHours) !== JSON.stringify(business.opening_hours || {}) ||
    routePlanningEnabled !== origRoutePlanning ||
    JSON.stringify(notifSettings) !== JSON.stringify({ new_order: true, upcoming_service: true, subscription_change: true, new_review: false, ...origNotif });

  return (
    <div className="space-y-4.5">
      <PageHeader
        eyebrow="Opsætning"
        title="Indstillinger"
        description="Hold virksomhedsdata, visning og drift samlet i samme kompakte opsætning."
        action={
          <PrimaryButton onClick={save} disabled={updateBiz.isPending || !hasChanges}>
            {updateBiz.isPending ? "Gemmer..." : "Gem ændringer"}
          </PrimaryButton>
        }
      />

      {/* CVR Lookup */}
      <Card className="rounded-md border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Automatisk udfyldning fra CVR</h3>
          </div>
          <p className="text-xs text-muted-foreground">Indtast CVR-nummer eller virksomhedsnavn for at udfylde de vigtigste felter hurtigt.</p>
          <div className="flex gap-2">
            <Input
              placeholder="CVR-nummer eller virksomhedsnavn..."
              value={cvrQuery}
              onChange={(e) => setCvrQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupCvr()}
              className="bg-card flex-1"
            />
            <Button onClick={lookupCvr} disabled={cvrLoading || !cvrQuery.trim()} size="sm"
              className="h-10 rounded-lg bg-foreground text-background hover:bg-foreground/90 px-4 text-sm font-medium">
              {cvrLoading ? "Søger..." : "Søg"}
            </Button>
          </div>
          {cvrError && <p className="mt-2 text-xs text-destructive">{cvrError}</p>}
          {cvrResult && (
            <div className="mt-3 rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{cvrResult.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    CVR: {cvrResult.vat} · {cvrResult.address}, {cvrResult.zipcode} {cvrResult.city}
                  </p>
                  {cvrResult.phone && <p className="text-xs text-muted-foreground">Tlf: {cvrResult.phone}</p>}
                  {cvrResult.email && <p className="text-xs text-muted-foreground">Email: {cvrResult.email}</p>}
                </div>
                <Button size="sm" onClick={applyCvrData}
                  className="shrink-0 h-8 rounded-md bg-foreground text-background hover:bg-foreground/90 text-xs font-medium">
                  Anvend oplysninger
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* General */}
      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Generelt
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Virksomhedsnavn</label>
              <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-10" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Beskrivelse</label>
              <Textarea placeholder="Hvad gør din virksomhed? Hvad er jeres speciale?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-card" />
              <p className="mt-1 text-xs text-muted-foreground">{description.length}/500 tegn</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Brancher</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => toggleSettingsCategory(c)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all ${
                      selectedCategories.includes(c)
                        ? "border-foreground bg-secondary shadow-sm"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}>
                    <span className="text-xs font-medium text-foreground">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Kontaktoplysninger
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefon</label>
                <Input placeholder="12 34 56 78" value={phone} onChange={(e) => handlePhoneChange(e.target.value)}
                  className="bg-card h-10" type="tel" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                <Input placeholder="kontakt@virksomhed.dk" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="bg-card h-10" type="email" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Adresse</label>
              <Input placeholder="Vejnavn 123" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-card h-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Postnummer</label>
                <div className="relative">
                  <Input placeholder="2100" value={zipCode} onChange={(e) => handleZipChange(e.target.value)}
                    className="bg-card h-10" maxLength={4} />
                  {zipLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">By udfyldes automatisk</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">By</label>
                <Input placeholder="København" value={city} onChange={(e) => setCity(e.target.value)} className="bg-card h-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Billeder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo</label>
              <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="" aspectRatio="aspect-square" className="w-24" objectFit="contain" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Coverbillede</label>
              <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="" aspectRatio="aspect-video" className="w-48" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifikationsindstillinger
          </h3>
          <p className="text-xs text-muted-foreground">Vælg hvilke hændelser du vil modtage varsler om.</p>
          <div className="space-y-3">
            {([
              { key: "new_order", label: "Nye bestillinger", desc: "Modtag besked når en kunde opretter en ny bestilling" },
              { key: "upcoming_service", label: "Kommende services", desc: "Påmindelse når en abonnements-service skal udføres snart" },
              { key: "subscription_change", label: "Abonnementsændringer", desc: "Besked når en kunde pauser eller annullerer et abonnement" },
              { key: "new_review", label: "Nye anmeldelser", desc: "Besked når en kunde skriver en anmeldelse" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                    notifSettings[key] ? "bg-accent" : "bg-border"
                  }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
                    notifSettings[key] ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Planning */}
      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            Ruteplanlægning
          </h3>
          <p className="text-xs text-muted-foreground">
            Aktivér ruteplanlægning for at oprette medarbejder-konti og planlægge daglige
            ruter med stop hos kunder. Ruterne kan optimeres med AI baseret på afstand,
            tidsvinduer og prioriteter.
          </p>
          <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Aktivér ruteplanlægning</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tilføjer "Medarbejdere"-fanen og giver adgang til ruteplanlæggeren.
              </p>
            </div>
            <button
              onClick={() => setRoutePlanningEnabled((v) => !v)}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                routePlanningEnabled ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
                  routePlanningEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>


      <Card className="rounded-md shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Åbningstider</h3>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const isWeekend = day === "Lørdag" || day === "Søndag";
              return (
                <div key={day} className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  openHours[day] ? "bg-secondary/30" : isWeekend ? "opacity-60" : ""
                }`}>
                  <span className="w-20 text-sm font-medium text-foreground">{day}</span>
                  <Input
                    placeholder={isWeekend ? "Lukket" : "Fx 08:00 - 16:00"}
                    value={openHours[day] || ""}
                    onChange={(e) => setOpenHours({ ...openHours, [day]: e.target.value })}
                    className="flex-1 h-8 text-sm bg-card"
                  />
                  {openHours[day] && (
                    <button onClick={() => { const h = { ...openHours }; delete h[day]; setOpenHours(h); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Ryd
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="sticky bottom-4 z-20">
            <Card className="rounded-md border-border bg-card shadow-lg">
            <CardContent className="flex items-center justify-between p-3">
              <p className="text-sm text-muted-foreground">Du har ændringer der ikke er gemt.</p>
              <Button onClick={save} disabled={updateBiz.isPending}
                className="h-9 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-semibold px-6 shadow-sm">
                {updateBiz.isPending ? "Gemmer..." : "Gem ændringer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;
