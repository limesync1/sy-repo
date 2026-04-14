import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders, useCreateBusiness, useCreateService,
  useUpdateService, useDeleteService, useUpdateBusiness, useUpdateOrderStatus,
  useUpsertCalculatorSteps, useReviews,
} from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, LogOut,
  Sparkles, Calculator, LayoutDashboard, Wrench, ShoppingCart,
  Star, Settings, Menu, X, ExternalLink,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import DashboardTab from "@/components/admin/DashboardTab";
import ReviewsTab from "@/components/admin/ReviewsTab";

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
  { value: "dashboard", label: "Overblik", icon: LayoutDashboard },
  { value: "services", label: "Services", icon: Wrench },
  { value: "orders", label: "Aftaler", icon: ShoppingCart },
  { value: "reviews", label: "Anmeldelser", icon: Star },
  { value: "settings", label: "Indstillinger", icon: Settings },
];

/* ─── Entry ─── */
const Admin = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/auth" replace />;
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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardWrapper business={business} />;
      case "services": return <ServicesTab businessId={business.id} />;
      case "orders": return <OrdersTab businessId={business.id} />;
      
      case "reviews": return <ReviewsWrapper businessId={business.id} />;
      case "settings": return <SettingsTab business={business} />;
      default: return null;
    }
  };

  const currentNav = NAV_ITEMS.find(n => n.value === activeTab);

  return (
    <div className="flex min-h-screen bg-[#f6f6f7]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-[hsl(222,47%,11%)] transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-6" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-white/50 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business info */}
        <div className="mx-2 mb-2 shrink-0 rounded-lg bg-white/[0.08] px-2.5 py-2">
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-7 w-7 shrink-0 rounded object-contain bg-white/10 p-0.5" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent/20 text-accent font-bold text-xs">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{business.name}</p>
              {business.categories && business.categories.length > 0 && <p className="truncate text-xs text-white/40">{(business.categories as string[]).join(", ")}</p>}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-px px-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => { setActiveTab(item.value); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.12] text-white"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer — always visible */}
        <div className="shrink-0 border-t border-white/[0.06] px-2 py-2 space-y-px">
          <Link
            to={`/b/${business.slug}`}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-sm font-medium text-white/55 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Se din side
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-sm font-medium text-white/55 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log ud
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#e1e3e5] bg-white px-5 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{currentNav?.label}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

/* ─── Dashboard Wrapper ─── */
const DashboardWrapper = ({ business }: { business: any }) => {
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
                      : "border-border bg-white hover:border-foreground/30"
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
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser services...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Services</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{services?.length || 0} services oprettet</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="h-8 gap-1.5 rounded-lg text-sm bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-3.5 w-3.5" /> Tilføj service
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
          <CardContent className="p-4">
            <ServiceForm businessId={businessId} onClose={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2.5">
        {services?.map((s) => (
          <ServiceRow key={s.id} service={s} onDelete={() => deleteService.mutate(s.id)} />
        ))}
        {(!services || services.length === 0) && !showForm && (
          <Card className="rounded-xl border-dashed border-[#e1e3e5]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 rounded-xl bg-muted p-2.5">
                <Wrench className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen services endnu</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Tilføj din første service for at komme i gang.</p>
              <Button onClick={() => setShowForm(true)} size="sm" className="mt-3 h-8 gap-1.5 rounded-lg text-sm bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-3.5 w-3.5" /> Tilføj service
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const ServiceRow = ({ service, onDelete }: { service: any; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const pricingLabels: Record<string, string> = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" };

  return (
    <Card className="rounded-xl shadow-sm border-[#e1e3e5] overflow-hidden">
      <CardContent className="flex items-center justify-between p-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{service.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 rounded">{pricingLabels[service.pricing_type] || service.pricing_type}</Badge>
            {service.base_price != null && <span>{service.base_price} kr{service.unit ? ` / ${service.unit}` : ""}</span>}
            {service.calculator_steps?.length > 0 && <span>· {service.calculator_steps.length} trin</span>}
            {service.subcategory && <Badge variant="outline" className="text-xs font-normal px-1.5 py-0 rounded">{service.subcategory}</Badge>}
          </div>
        </div>
        <div className="ml-3 flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="h-7 rounded-lg text-sm px-2.5">
            {editing ? "Luk" : "Rediger"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
      </CardContent>
      {editing && (
        <div className="border-t border-[#e1e3e5] p-4">
          <ServiceForm businessId={service.business_id} existingService={service} onClose={() => setEditing(false)} />
        </div>
      )}
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
      <div className="flex items-center">
        {FORM_STEPS.map((s, i) => (
          <div key={s.num} className="flex flex-1 items-center">
            <button
              onClick={() => { if (s.num <= currentStep || canGoNext()) setCurrentStep(s.num); }}
              className="flex items-center gap-2"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                currentStep === s.num ? `${s.color} text-white shadow-md scale-110` :
                s.num < currentStep ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {s.num < currentStep ? "✓" : s.num}
              </span>
              <span className={`hidden sm:block text-sm font-medium ${
                currentStep === s.num ? "text-foreground" : s.num < currentStep ? "text-green-600" : "text-muted-foreground"
              }`}>{s.label}</span>
            </button>
            {i < FORM_STEPS.length - 1 && (
              <div className={`mx-3 h-0.5 flex-1 rounded-full transition-colors ${s.num < currentStep ? "bg-green-300" : "bg-border"}`} />
            )}
          </div>
        ))}
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
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all hover:shadow-sm ${
                      serviceCategory === c
                        ? "border-foreground bg-foreground/5 shadow-sm"
                        : "border-border bg-white hover:border-foreground/30"
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
              <Input placeholder="Fx Vinduespolering" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="bg-white" />
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
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                          subcategory === s
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-white text-foreground hover:border-foreground/40"
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
                  <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-white" />
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
              <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="bg-white" />
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
            <Input placeholder="Fx Rengøring af kontor" value={name} onChange={(e) => setName(e.target.value)} className="bg-white h-11 text-base" />
            {productSuggestions.length > 0 && !name && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground mr-1">Forslag:</span>
                {productSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Beskrivelse</label>
            <Textarea placeholder="Hvad inkluderer denne service? Hvad kan kunden forvente?" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white" rows={3} />
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
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  pricingType === opt.value
                    ? "border-foreground bg-foreground/5 shadow-sm"
                    : "border-border bg-white hover:border-foreground/30 hover:shadow-sm"
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
                <Input type="number" placeholder="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="bg-white h-11 text-base" />
              </div>
              {pricingType === "timepris" && (
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Enhed</label>
                  <Input placeholder="Fx timer" value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-white h-11 text-base" />
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
            <h4 className="text-base font-semibold text-foreground">Opsæt prisberegner</h4>
            <p className="mt-1 text-sm text-muted-foreground">Tilføj de trin kunden skal igennem for at beregne prisen</p>
          </div>

          {availableTemplates.length > 0 && steps.length === 0 && (
            <div className="rounded-xl border border-border bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Kom hurtigt i gang med en skabelon</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableTemplates.map((t) => (
                  <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                    className="rounded-xl border border-border bg-muted/30 p-4 text-left transition-all hover:border-foreground/30 hover:shadow-sm">
                    <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t.steps.length} trin · {t.steps.map(s => s.unit).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</span>
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
              <Card key={i} className="rounded-xl shadow-sm border-[#e1e3e5]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{step.label || `Trin ${i + 1}`}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">Navn</label>
                      <Input placeholder="Fx Støvsugning" value={step.label} onChange={(e) => updateStep(i, "label", e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">Enhed</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"].map((u) => (
                          <button key={u} type="button" onClick={() => updateStep(i, "unit", u)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                              step.unit === u
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-white text-muted-foreground hover:border-foreground/40"
                            }`}>{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: `Pris / ${step.unit || "enhed"}`, field: "price_per_unit", value: step.price_per_unit },
                      { label: "Min", field: "min_value", value: step.min_value },
                      { label: "Max", field: "max_value", value: step.max_value },
                      { label: "Standard", field: "default_value", value: step.default_value },
                    ].map((f) => (
                      <div key={f.field}>
                        <label className="mb-1 block text-sm text-muted-foreground">{f.label}</label>
                        <Input type="number" placeholder="0" value={f.value} onChange={(e) => updateStep(i, f.field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {steps.length === 0 && (
              <div className="py-10 text-center rounded-xl border border-dashed border-border bg-white">
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
            <h4 className="text-base font-semibold text-foreground">Vælg intervaller</h4>
            <p className="mt-1 text-sm text-muted-foreground">Hvilke intervaller kan kunden vælge for denne service?</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_INTERVALS.map((iv) => (
              <button key={iv.value} type="button" onClick={() => toggleInterval(iv.value)}
                className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                  intervalOptions.includes(iv.value)
                    ? "border-foreground bg-foreground/5 shadow-sm"
                    : "border-border bg-white hover:border-foreground/30"
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

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="rounded-lg">
              ← Tilbage
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="rounded-lg text-muted-foreground">Annuller</Button>
        </div>
        <div>
          {currentStep < totalSteps ? (
            <Button onClick={() => { if (canGoNext()) setCurrentStep(currentStep + 1); else toast.error("Udfyld venligst de påkrævede felter"); }}
              disabled={!canGoNext()}
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90 px-6">
              Næste →
            </Button>
          ) : (
            <Button onClick={handleSave} className="rounded-lg bg-green-600 text-white hover:bg-green-700 px-6">
              {existingService ? "Gem ændringer" : "✓ Opret service"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Aftaler Tab (Orders) ─── */
const OrdersTab = ({ businessId }: { businessId: string }) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const updateStatus = useUpdateOrderStatus();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"accepted" | "rejected" | "adjusted">("accepted");
  const [responseMessage, setResponseMessage] = useState("");
  const [adjustedItems, setAdjustedItems] = useState<Record<string, { service_name: string; unit_price: number; quantity: number; total_price: number; details: any }[]>>({});

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
    confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
    in_progress: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
    completed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  };
  const responseLabels: Record<string, { label: string; color: string }> = {
    accepted: { label: "Godkendt", color: "bg-green-50 text-green-700" },
    rejected: { label: "Afvist", color: "bg-red-50 text-red-700" },
    adjusted: { label: "Tilpasset", color: "bg-amber-50 text-amber-700" },
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser aftaler...</p>;

  const filteredOrders = filter === "all" ? orders : orders?.filter((o) => o.status === filter);
  const counts: Record<string, number> = { all: orders?.length || 0 };
  orders?.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const initAdjustedItems = (order: any) => {
    const items = (order.order_items || []).map((item: any) => ({
      service_name: item.service_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price,
      details: item.details ? {
        ...item.details,
        stepDetails: item.details.stepDetails?.map((sd: any) => ({
          ...sd,
          price_per_unit: sd.price_per_unit ?? (sd.value ? Math.round(sd.subtotal / sd.value * 100) / 100 : 0),
        })),
      } : {},
    }));
    setAdjustedItems((prev) => ({ ...prev, [order.id]: items }));
  };

  const updateAdjustedStep = (orderId: string, itemIdx: number, stepIdx: number, field: string, value: number) => {
    setAdjustedItems((prev) => {
      const items = [...(prev[orderId] || [])];
      const item = { ...items[itemIdx] };
      const details = { ...item.details };
      const steps = [...(details.stepDetails || [])];
      const step = { ...steps[stepIdx] };
      if (field === "value") {
        step.value = value;
        step.subtotal = Math.round(value * step.price_per_unit * 100) / 100;
      } else if (field === "price_per_unit") {
        step.price_per_unit = value;
        step.subtotal = Math.round(step.value * value * 100) / 100;
      }
      steps[stepIdx] = step;
      details.stepDetails = steps;
      item.details = details;
      item.total_price = steps.reduce((sum: number, s: any) => sum + (s.subtotal || 0), 0);
      item.unit_price = item.total_price;
      items[itemIdx] = item;
      return { ...prev, [orderId]: items };
    });
  };

  const updateAdjustedFixedPrice = (orderId: string, itemIdx: number, newPrice: number) => {
    setAdjustedItems((prev) => {
      const items = [...(prev[orderId] || [])];
      const item = { ...items[itemIdx] };
      item.total_price = newPrice;
      item.unit_price = newPrice;
      items[itemIdx] = item;
      return { ...prev, [orderId]: items };
    });
  };

  const getAdjustedTotal = (orderId: string) => {
    return (adjustedItems[orderId] || []).reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleResponse = async (orderId: string) => {
    try {
      const adjustedData = responseType === "adjusted" ? adjustedItems[orderId] : null;
      const adjustedTotal = adjustedData ? adjustedData.reduce((sum, i) => sum + i.total_price, 0) : null;

      const { error } = await supabase.from("orders").update({
        business_response: responseType,
        business_message: responseMessage || null,
        adjusted_amount: adjustedTotal,
        adjusted_details: adjustedData ? { items: adjustedData } as any : null,
        status: responseType === "accepted" ? "confirmed" as const : responseType === "rejected" ? "cancelled" as const : "pending" as const,
      }).eq("id", orderId);
      if (error) throw error;

      toast.success(
        responseType === "accepted" ? "Aftale godkendt!" :
        responseType === "rejected" ? "Aftale afvist" :
        "Tilpasningsforslag sendt til kunden"
      );
      setRespondingTo(null);
      setResponseMessage("");
      setAdjustedItems((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Aftaler</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{orders?.length || 0} aftaler i alt</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-0 border-b border-[#e1e3e5] overflow-x-auto">
        {[{ key: "all", label: "Alle" }, ...Object.entries(statusLabels).map(([k, v]) => ({ key: k, label: v }))].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:rounded-t"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {(counts[key] || 0) > 0 && (
              <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                filter === key ? "bg-foreground/10" : "bg-muted"
              }`}>
                {counts[key] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;
            const isResponding = respondingTo === order.id;
            const resp = order.business_response;
            const respCfg = resp ? responseLabels[resp] : null;

            return (
              <Card key={order.id} className="rounded-xl shadow-sm border-[#e1e3e5] overflow-hidden">
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.customer_email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {statusLabels[order.status]}
                      </span>
                      {respCfg && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${respCfg.color}`}>
                          {respCfg.label}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {order.adjusted_amount || order.total_amount} kr
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {(order as any).order_items?.length > 0 && (
                      <span>· {(order as any).order_items.length} {(order as any).order_items.length === 1 ? "service" : "services"}</span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#e1e3e5] bg-muted/10 px-4 py-4 space-y-4">
                    {/* Customer details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{order.customer_email}</span></div>
                      {order.customer_phone && <div><span className="text-muted-foreground">Tlf:</span> <span className="text-foreground">{order.customer_phone}</span></div>}
                    </div>

                    {/* Order items */}
                    {(order as any).order_items?.length > 0 && (
                      <div className="rounded-xl bg-card border border-border overflow-hidden">
                        <div className="px-3.5 py-2 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services i aftalen</div>
                        {(order as any).order_items.map((item: any) => (
                          <div key={item.id} className="border-t border-border px-3.5 py-2.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-foreground">{item.service_name}{item.quantity > 1 && ` × ${item.quantity}`}</span>
                              <span className="font-semibold text-foreground">{item.total_price} kr</span>
                            </div>
                            {item.details?.stepDetails && (
                              <div className="mt-1.5 space-y-0.5">
                                {(item.details.stepDetails as any[]).map((sd: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs text-muted-foreground pl-2">
                                    <span>{sd.label}: {sd.value} {sd.unit}</span>
                                    <span>{sd.subtotal} kr</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.details?.interval && item.details.interval !== "engangskøb" && (
                              <span className="mt-1 inline-block text-xs text-accent">{item.details.interval}</span>
                            )}
                          </div>
                        ))}
                        <div className="border-t border-border px-3.5 py-2 flex justify-between text-sm font-bold text-foreground bg-muted/30">
                          <span>Kundens pris i alt</span>
                          <span>{order.total_amount} kr</span>
                        </div>
                      </div>
                    )}

                    {order.notes && <p className="text-sm italic text-foreground/80 bg-card rounded-lg px-3 py-2 border border-border">"{order.notes}"</p>}

                    {/* Business response display */}
                    {order.business_message && !isResponding && (
                      <div className="rounded-xl bg-accent/5 border border-accent/20 px-3.5 py-3">
                        <p className="text-xs font-semibold text-accent mb-1">Din besked til kunden:</p>
                        <p className="text-sm text-foreground">{order.business_message}</p>
                        {order.adjusted_amount && (
                          <p className="mt-1 text-sm font-semibold text-foreground">Tilpasset pris: {order.adjusted_amount} kr</p>
                        )}
                      </div>
                    )}

                    {/* Adjusted details display */}
                    {resp === "adjusted" && order.adjusted_details && !isResponding && (
                      <div className="rounded-xl bg-amber-50/50 border border-amber-200 overflow-hidden">
                        <div className="px-3.5 py-2 bg-amber-100/50 text-xs font-semibold text-amber-800">Tilpasset prisforslag</div>
                        {((order.adjusted_details as any)?.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="border-t border-amber-200/60 px-3.5 py-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-foreground">{item.service_name}</span>
                              <span className="font-semibold text-foreground">{item.total_price} kr</span>
                            </div>
                            {item.details?.stepDetails?.map((sd: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs text-muted-foreground pl-2 mt-0.5">
                                <span>{sd.label}: {sd.value} {sd.unit} × {sd.price_per_unit} kr/{sd.unit}</span>
                                <span>{sd.subtotal} kr</span>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div className="border-t border-amber-200 px-3.5 py-2 flex justify-between text-sm font-bold text-foreground bg-amber-100/30">
                          <span>Tilpasset total</span>
                          <span>{order.adjusted_amount} kr</span>
                        </div>
                      </div>
                    )}

                    {/* Response actions */}
                    {order.status !== "completed" && order.status !== "cancelled" && !isResponding && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("accepted"); }}
                          className="gap-1.5 rounded-xl text-xs bg-green-600 text-white hover:bg-green-700">
                          ✓ Godkend aftale
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); initAdjustedItems(order); setRespondingTo(order.id); setResponseType("adjusted"); }}
                          className="gap-1.5 rounded-xl text-xs">
                          ✎ Tilpas aftale
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("rejected"); }}
                          className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                          ✕ Afvis
                        </Button>
                      </div>
                    )}

                    {/* Response form */}
                    {isResponding && (
                      <div className="rounded-xl border border-border bg-card p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-sm font-semibold text-foreground">
                          {responseType === "accepted" ? "Godkend aftale" : responseType === "rejected" ? "Afvis aftale" : "Tilpas aftale"}
                        </h4>

                        {/* Response type selector */}
                        <div className="flex gap-2">
                          {(["accepted", "adjusted", "rejected"] as const).map((type) => (
                            <button key={type} onClick={() => {
                              setResponseType(type);
                              if (type === "adjusted" && !adjustedItems[order.id]) initAdjustedItems(order);
                            }}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                responseType === type
                                  ? type === "accepted" ? "border-green-600 bg-green-600 text-white"
                                  : type === "rejected" ? "border-destructive bg-destructive text-destructive-foreground"
                                  : "border-foreground bg-foreground text-background"
                                  : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                              }`}>
                              {type === "accepted" ? "✓ Godkend" : type === "adjusted" ? "✎ Tilpas" : "✕ Afvis"}
                            </button>
                          ))}
                        </div>

                        {/* Line-item adjustment editor */}
                        {responseType === "adjusted" && adjustedItems[order.id] && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Rediger priserne eller mængderne herunder. Kunden vil se dine ændringer.</p>
                            {adjustedItems[order.id].map((item, itemIdx) => (
                              <div key={itemIdx} className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                                <div className="px-3.5 py-2 bg-muted/40 flex justify-between items-center">
                                  <span className="text-sm font-semibold text-foreground">{item.service_name}</span>
                                  <span className="text-sm font-bold text-foreground">{Math.round(item.total_price)} kr</span>
                                </div>
                                {item.details?.stepDetails && item.details.stepDetails.length > 0 ? (
                                  <div className="divide-y divide-border">
                                    {item.details.stepDetails.map((sd: any, stepIdx: number) => (
                                      <div key={stepIdx} className="px-3.5 py-2.5 grid grid-cols-[1fr_80px_80px_70px] gap-2 items-center">
                                        <span className="text-sm text-foreground">{sd.label}</span>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground block mb-0.5">Antal ({sd.unit})</label>
                                          <Input type="number" value={sd.value} className="h-8 text-sm"
                                            onChange={(e) => updateAdjustedStep(order.id, itemIdx, stepIdx, "value", parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground block mb-0.5">Pris/{sd.unit}</label>
                                          <Input type="number" value={sd.price_per_unit} className="h-8 text-sm"
                                            onChange={(e) => updateAdjustedStep(order.id, itemIdx, stepIdx, "price_per_unit", parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="text-right">
                                          <label className="text-[10px] text-muted-foreground block mb-0.5">Subtotal</label>
                                          <span className="text-sm font-semibold text-foreground">{Math.round(sd.subtotal)} kr</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-3.5 py-2.5">
                                    <label className="text-xs text-muted-foreground block mb-1">Tilpasset pris (kr)</label>
                                    <Input type="number" value={item.total_price} className="h-8 text-sm w-32"
                                      onChange={(e) => updateAdjustedFixedPrice(order.id, itemIdx, parseFloat(e.target.value) || 0)} />
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex justify-between items-center px-1 pt-1">
                              <span className="text-sm text-muted-foreground">Oprindelig pris: <span className="line-through">{order.total_amount} kr</span></span>
                              <span className="text-base font-bold text-foreground">Ny pris: {Math.round(getAdjustedTotal(order.id))} kr</span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Besked til kunden {responseType === "accepted" ? "(valgfrit)" : ""}
                          </label>
                          <Textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)}
                            placeholder={
                              responseType === "accepted" ? "Tak for din aftale! Vi glæder os til at hjælpe dig."
                              : responseType === "adjusted" ? "Vi vil gerne foreslå en tilpasning af aftalen..."
                              : "Vi kan desværre ikke udføre denne opgave fordi..."
                            }
                            rows={3} className="text-sm" />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleResponse(order.id)}
                            className={`rounded-xl text-xs ${
                              responseType === "accepted" ? "bg-green-600 hover:bg-green-700 text-white" :
                              responseType === "rejected" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" :
                              "bg-foreground text-background hover:bg-foreground/90"
                            }`}>
                            {responseType === "accepted" ? "Bekræft godkendelse" :
                             responseType === "rejected" ? "Bekræft afvisning" :
                             `Send tilpasning – ${Math.round(getAdjustedTotal(order.id))} kr`}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseMessage(""); }}
                            className="rounded-xl text-xs">
                            Annuller
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Status change for responded orders */}
                    {resp && order.status !== "cancelled" && !isResponding && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Opdater status</label>
                        <Select value={order.status} onValueChange={(s) => updateStatus.mutate({ id: order.id, status: s })}>
                          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-xl border-dashed border-[#e1e3e5]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 rounded-xl bg-muted p-2.5">
              <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {filter === "all" ? "Ingen aftaler endnu" : `Ingen aftaler med status "${statusLabels[filter]}"`}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Aftaler vil vises her når de kommer ind.</p>
          </CardContent>
        </Card>
      )}
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

  const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

  const toggleSettingsCategory = (c: string) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
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
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Indstillinger</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Administrer din virksomheds profil og oplysninger.</p>
      </div>

      <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Generelt</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Virksomhedsnavn</label>
              <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Beskrivelse</label>
              <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Brancher</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => toggleSettingsCategory(c)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      selectedCategories.includes(c)
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-foreground hover:border-foreground/40"
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Kontaktoplysninger</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Telefon</label>
                <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Adresse</label>
              <Input placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Postnummer</label>
                <Input placeholder="Postnummer" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">By</label>
                <Input placeholder="By" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Billeder</h3>
          <div className="flex flex-wrap gap-4">
            <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="Logo" aspectRatio="aspect-square" className="w-20" />
            <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="Coverbillede" aspectRatio="aspect-video" className="w-36" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border-[#e1e3e5]">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Åbningstider</h3>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-muted-foreground">{day}</span>
                <Input placeholder="Fx 08:00 - 16:00" value={openHours[day] || ""}
                  onChange={(e) => setOpenHours({ ...openHours, [day]: e.target.value })} className="flex-1 h-8 text-sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={updateBiz.isPending} className="h-8 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm">
        {updateBiz.isPending ? "Gemmer..." : "Gem indstillinger"}
      </Button>
    </div>
  );
};

export default Admin;
