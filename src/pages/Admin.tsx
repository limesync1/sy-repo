import { useAuth } from "@/contexts/AuthContext";
import {
  useMyBusiness, useServices, useOrders, useCreateBusiness, useCreateService,
  useUpdateService, useDeleteService, useUpdateBusiness, useUpdateOrderStatus,
  useUpsertCalculatorSteps, useQuoteRequests, useCreateQuote, useMyQuotes, useReviews,
} from "@/hooks/useDatabase";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import {
  Plus, Trash2, LogOut, Send, GripVertical,
  Sparkles, Calculator, LayoutDashboard, Wrench, ShoppingCart, MessageSquare,
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
  { value: "orders", label: "Ordrer", icon: ShoppingCart },
  { value: "quotes", label: "Tilbud", icon: MessageSquare },
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
      case "quotes": return <QuotesTab business={business} />;
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
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col bg-[hsl(222,47%,11%)] transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent/20 text-accent font-bold text-[11px]">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white">{business.name}</p>
              {business.category && <p className="truncate text-[10px] text-white/40">{business.category}</p>}
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
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-medium transition-colors ${
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
            className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-medium text-white/55 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Se din side
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-medium text-white/55 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log ud
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-[#e1e3e5] bg-white px-4 sm:px-5">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-foreground">{currentNav?.label}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-5">
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
  const [category, setCategory] = useState("");

  const handleCreate = () => {
    if (!name.trim()) { toast.error("Indtast et navn"); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "");
    createBiz.mutate({
      name: name.trim(), slug, description: description.trim() || null,
      owner_id: user!.id, category: category || null,
    } as any, {
      onSuccess: () => toast.success("Virksomhed oprettet!"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <CardTitle className="text-xl">Opret din virksomhed</CardTitle>
          <p className="text-sm text-muted-foreground">Udfyld oplysningerne for at komme i gang.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Beskrivelse (valgfrit)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Vælg kategori" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={createBiz.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
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

  if (isLoading) return <p className="text-[13px] text-muted-foreground">Indlæser services...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Services</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{services?.length || 0} services oprettet</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="h-8 gap-1.5 rounded-lg text-[13px] bg-foreground text-background hover:bg-foreground/90">
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
              <p className="text-[13px] font-medium text-foreground">Ingen services endnu</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Tilføj din første service for at komme i gang.</p>
              <Button onClick={() => setShowForm(true)} size="sm" className="mt-3 h-8 gap-1.5 rounded-lg text-[13px] bg-foreground text-background hover:bg-foreground/90">
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
          <h3 className="text-[13px] font-semibold text-foreground">{service.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
            <Badge variant="secondary" className="text-[11px] font-normal px-1.5 py-0 rounded">{pricingLabels[service.pricing_type] || service.pricing_type}</Badge>
            {service.base_price != null && <span>{service.base_price} kr{service.unit ? ` / ${service.unit}` : ""}</span>}
            {service.calculator_steps?.length > 0 && <span>· {service.calculator_steps.length} trin</span>}
            {service.subcategory && <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0 rounded">{service.subcategory}</Badge>}
          </div>
        </div>
        <div className="ml-3 flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="h-7 rounded-lg text-[12px] px-2.5">
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

  const categoryOptions = Object.keys(SERVICE_CATEGORIES);
  const subcategoryOptions = serviceCategory && SERVICE_CATEGORIES[serviceCategory]
    ? Object.keys(SERVICE_CATEGORIES[serviceCategory]) : [];
  const productSuggestions = serviceCategory && subcategory && SERVICE_CATEGORIES[serviceCategory]?.[subcategory]
    ? SERVICE_CATEGORIES[serviceCategory][subcategory] : [];
  const availableTemplates = STEP_TEMPLATES[serviceCategory] || [];

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

  return (
    <div className="space-y-5">
      {/* Step 1: Category */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">1</span>
          Kategori
        </h4>
        {!customCategory ? (
          <div className="space-y-2">
            <Select value={serviceCategory} onValueChange={(v) => { setServiceCategory(v); setSubcategory(""); setCustomSubcategory(false); }}>
              <SelectTrigger><SelectValue placeholder="Vælg kategori (fx Rengøring)" /></SelectTrigger>
              <SelectContent>{categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <button type="button" onClick={() => { setCustomCategory(true); setServiceCategory(""); }} className="text-xs text-accent hover:underline">Skriv din egen kategori</button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input placeholder="Fx Vinduespolering" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} />
            <button type="button" onClick={() => { setCustomCategory(false); setServiceCategory(""); }} className="text-xs text-accent hover:underline">Vælg fra listen</button>
          </div>
        )}
      </div>

      {/* Step 2: Subcategory */}
      {serviceCategory && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">2</span>
            Underkategori
          </h4>
          {!customSubcategory && subcategoryOptions.length > 0 ? (
            <div className="space-y-2">
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger><SelectValue placeholder="Vælg underkategori" /></SelectTrigger>
                <SelectContent>{subcategoryOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <button type="button" onClick={() => { setCustomSubcategory(true); setSubcategory(""); }} className="text-xs text-accent hover:underline">Skriv din egen underkategori</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Fx Erhvervsrengøring" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
              {subcategoryOptions.length > 0 && (
                <button type="button" onClick={() => { setCustomSubcategory(false); setSubcategory(""); }} className="text-xs text-accent hover:underline">Vælg fra listen</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Service details */}
      {serviceCategory && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">3</span>
            Service / Produkt
          </h4>

          <div>
            <Input placeholder="Servicenavn (fx Rengøring af kontor)" value={name} onChange={(e) => setName(e.target.value)} />
            {productSuggestions.length > 0 && !name && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {productSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>

          <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />

          <ImageUpload folder={`${user!.id}/services`} currentUrl={imageUrl || null} onUploaded={setImageUrl} label="Servicebillede" aspectRatio="aspect-video" />

          {/* Pricing Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Pristype</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "fast_pris", label: "Fast pris", desc: "Én fast pris" },
                { value: "timepris", label: "Timepris", desc: "Pris pr. time" },
                { value: "prisberegner", label: "Prisberegner", desc: "Kunden beregner selv" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setPricingType(opt.value)}
                  className={`rounded-lg border p-3 text-left transition-all ${pricingType === opt.value ? "border-accent bg-accent/10 ring-1 ring-accent/50" : "border-border hover:border-muted-foreground/30"}`}>
                  <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(pricingType === "fast_pris" || pricingType === "timepris") && (
            <div className="flex gap-2">
              <Input type="number" placeholder={pricingType === "fast_pris" ? "Pris (kr)" : "Timepris (kr)"} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
              {pricingType === "timepris" && <Input placeholder="Enhed (fx timer)" value={unit} onChange={(e) => setUnit(e.target.value)} />}
            </div>
          )}

          {pricingType === "prisberegner" && (
            <div className="space-y-4">
              {availableTemplates.length > 0 && steps.length === 0 && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold text-foreground">Hurtigstart med skabelon</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableTemplates.map((t) => (
                      <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                        className="rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-accent/50 hover:shadow-sm">
                        <span className="block text-sm font-medium text-foreground">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.steps.length} trin · {t.steps.map(s => s.unit).join(", ")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">Beregnertrin</h4>
                    <p className="text-xs text-muted-foreground">Hvert trin lader kunden vælge en mængde.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addStep} className="gap-1"><Plus className="h-3 w-3" /> Tilføj</Button>
                </div>

                {steps.map((step, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                        <span className="text-xs font-semibold text-muted-foreground">Trin {i + 1}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Navn</label>
                        <Input placeholder="Fx Støvsugning" value={step.label} onChange={(e) => updateStep(i, "label", e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Enhed</label>
                        <Select value={step.unit} onValueChange={(v) => updateStep(i, "unit", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Pris / {step.unit || "enhed"}</label>
                        <Input type="number" placeholder="0" value={step.price_per_unit} onChange={(e) => updateStep(i, "price_per_unit", e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Min</label>
                        <Input type="number" placeholder="0" value={step.min_value} onChange={(e) => updateStep(i, "min_value", e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Max</label>
                        <Input type="number" placeholder="100" value={step.max_value} onChange={(e) => updateStep(i, "max_value", e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Standard</label>
                        <Input type="number" placeholder="0" value={step.default_value} onChange={(e) => updateStep(i, "default_value", e.target.value)} className="h-9" />
                      </div>
                    </div>
                  </div>
                ))}

                {steps.length === 0 && (
                  <div className="py-6 text-center">
                    <Calculator className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {availableTemplates.length > 0 ? "Vælg en skabelon ovenfor eller tilføj trin manuelt." : "Tilføj trin for at oprette din prisberegner."}
                    </p>
                  </div>
                )}
              </div>

              <CalculatorPreview steps={steps} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {existingService ? "Gem ændringer" : "Opret service"}
        </Button>
        <Button variant="outline" onClick={onClose}>Annuller</Button>
      </div>
    </div>
  );
};

/* ─── Orders Tab ─── */
const OrdersTab = ({ businessId }: { businessId: string }) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const updateStatus = useUpdateOrderStatus();
  const [filter, setFilter] = useState<string>("all");

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800", completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (isLoading) return <p className="text-muted-foreground">Indlæser ordrer...</p>;

  const filteredOrders = filter === "all" ? orders : orders?.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ordrer</h2>
          <p className="text-sm text-muted-foreground">{orders?.length || 0} ordrer i alt</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-accent text-accent-foreground" : ""}>
            Alle
          </Button>
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = orders?.filter((o) => o.status === key).length || 0;
            return (
              <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)}
                className={filter === key ? "bg-accent text-accent-foreground" : ""}>
                {label} {count > 0 && <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders?.map((order) => (
          <Card key={order.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{order.customer_name}</h3>
                    <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                  {order.customer_phone && <p className="text-sm text-muted-foreground">{order.customer_phone}</p>}
                  {order.notes && <p className="mt-1 text-sm text-foreground/80 italic">"{order.notes}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground whitespace-nowrap">{order.total_amount} kr</span>
                  <Select value={order.status} onValueChange={(s) => updateStatus.mutate({ id: order.id, status: s })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(order as any).order_items?.length > 0 && (
                <div className="mt-3 space-y-1 rounded-lg bg-muted/50 p-3">
                  {(order as any).order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.service_name}
                        {item.quantity > 1 && ` × ${item.quantity}`}
                      </span>
                      <span className="font-medium text-foreground">{item.total_price} kr</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!filteredOrders || filteredOrders.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-xl bg-muted p-3">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">
                {filter === "all" ? "Ingen ordrer endnu" : `Ingen ordrer med status "${statusLabels[filter]}"`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

/* ─── Quotes Tab ─── */
const QuotesTab = ({ business }: { business: any }) => {
  const { data: requests, isLoading } = useQuoteRequests(business.category);
  const { data: myQuotes } = useMyQuotes(business.id);
  const createQuote = useCreateQuote();
  const [quoteData, setQuoteData] = useState<Record<string, { price: string; message: string }>>({});

  if (isLoading) return <p className="text-muted-foreground">Indlæser anmodninger...</p>;

  const answeredIds = new Set(myQuotes?.map((q) => q.quote_request_id));

  const handleSendQuote = (requestId: string) => {
    const d = quoteData[requestId];
    if (!d?.price) { toast.error("Indtast en pris"); return; }
    createQuote.mutate({
      business_id: business.id,
      quote_request_id: requestId,
      price: parseFloat(d.price),
      message: d.message || null,
    }, {
      onSuccess: () => {
        toast.success("Tilbud sendt!");
        setQuoteData((prev) => { const copy = { ...prev }; delete copy[requestId]; return copy; });
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tilbudsanmodninger</h2>
        <p className="text-sm text-muted-foreground">{requests?.length || 0} anmodninger i din kategori</p>
      </div>
      <div className="space-y-3">
        {requests?.map((req) => (
          <Card key={req.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{req.customer_name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{req.customer_email}</p>
                {req.customer_phone && <p className="text-sm text-muted-foreground">{req.customer_phone}</p>}
                <Badge variant="secondary" className="mt-1.5">{req.category}</Badge>
              </div>
              <p className="mb-3 text-sm text-foreground">{req.description}</p>
              {answeredIds.has(req.id) ? (
                <Badge className="bg-green-100 text-green-800">✓ Besvaret</Badge>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Din pris (kr)"
                      value={quoteData[req.id]?.price || ""}
                      onChange={(e) => setQuoteData((prev) => ({ ...prev, [req.id]: { ...prev[req.id], price: e.target.value, message: prev[req.id]?.message || "" } }))}
                    />
                    <Input placeholder="Besked (valgfrit)"
                      value={quoteData[req.id]?.message || ""}
                      onChange={(e) => setQuoteData((prev) => ({ ...prev, [req.id]: { ...prev[req.id], message: e.target.value, price: prev[req.id]?.price || "" } }))}
                    />
                  </div>
                  <Button size="sm" onClick={() => handleSendQuote(req.id)} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Send className="h-3.5 w-3.5" /> Send tilbud
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!requests || requests.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-xl bg-muted p-3">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">Ingen åbne anmodninger</p>
              <p className="mt-1 text-sm text-muted-foreground">Anmodninger i din kategori vises her.</p>
            </CardContent>
          </Card>
        )}
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
  const [category, setCategory] = useState(business.category || "");
  const [openHours, setOpenHours] = useState<Record<string, string>>(business.opening_hours || {});

  const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

  const save = () => {
    updateBiz.mutate({
      id: business.id, name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null, email: email.trim() || null,
      address: address.trim() || null, city: city.trim() || null,
      zip_code: zipCode.trim() || null,
      logo_url: logoUrl || null, cover_image_url: coverUrl || null,
      category: category || null, opening_hours: openHours,
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Indstillinger</h2>
        <p className="text-sm text-muted-foreground">Administrer din virksomheds profil og oplysninger.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generelt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontaktoplysninger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Postnummer" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            <Input placeholder="By" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billeder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="Logo" aspectRatio="aspect-square" />
          <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="Coverbillede" aspectRatio="aspect-video" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Åbningstider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm text-muted-foreground">{day}</span>
              <Input placeholder="Fx 08:00 - 16:00" value={openHours[day] || ""}
                onChange={(e) => setOpenHours({ ...openHours, [day]: e.target.value })} className="flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={updateBiz.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
        {updateBiz.isPending ? "Gemmer..." : "Gem indstillinger"}
      </Button>
    </div>
  );
};

export default Admin;
