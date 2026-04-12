import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness, useServices, useOrders, useCreateBusiness, useCreateService, useUpdateService, useDeleteService, useUpdateBusiness, useUpdateOrderStatus, useUpsertCalculatorSteps, useQuoteRequests, useCreateQuote, useMyQuotes } from "@/hooks/useDatabase";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, LogOut, ExternalLink, ArrowLeft, Send } from "lucide-react";

const Admin = () => {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AdminDashboard />;
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { data: business, isLoading } = useMyBusiness();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!business) return <CreateBusinessForm />;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <span className="font-bold text-foreground">{business.name} – Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/b/${business.slug}`}>
              <Button variant="outline" size="sm" className="gap-1"><ExternalLink className="h-4 w-4" /> Se side</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="services">
          <TabsList className="mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="orders">Ordrer</TabsTrigger>
            <TabsTrigger value="quotes">Tilbud</TabsTrigger>
            <TabsTrigger value="settings">Indstillinger</TabsTrigger>
          </TabsList>

          <TabsContent value="services"><ServicesTab businessId={business.id} /></TabsContent>
          <TabsContent value="orders"><OrdersTab businessId={business.id} /></TabsContent>
          <TabsContent value="quotes"><QuotesTab business={business} /></TabsContent>
          <TabsContent value="settings"><SettingsTab business={business} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const CATEGORIES = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS", "Elektriker", "Sikkerhed"];

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
      name: name.trim(),
      slug,
      description: description.trim() || null,
      owner_id: user!.id,
      category: category || null,
    } as any, {
      onSuccess: () => toast.success("Virksomhed oprettet!"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Opret din virksomhed</CardTitle></CardHeader>
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

// Services Tab
const ServicesTab = ({ businessId }: { businessId: string }) => {
  const { data: services, isLoading } = useServices(businessId);
  const deleteService = useDeleteService();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Indlæser services...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Services ({services?.length || 0})</h2>
        <Button onClick={() => setShowForm(true)} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" /> Tilføj service
        </Button>
      </div>
      {showForm && <ServiceForm businessId={businessId} onClose={() => setShowForm(false)} />}
      <div className="space-y-3">
        {services?.map((s) => (
          <ServiceRow key={s.id} service={s} onDelete={() => deleteService.mutate(s.id)} />
        ))}
        {(!services || services.length === 0) && !showForm && (
          <p className="py-8 text-center text-muted-foreground">Ingen services endnu. Tilføj din første!</p>
        )}
      </div>
    </div>
  );
};

const ServiceRow = ({ service, onDelete }: { service: any; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const pricingLabels: Record<string, string> = { fast_pris: "Fast pris", timepris: "Timepris", prisberegner: "Prisberegner" };

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold text-foreground">{service.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{pricingLabels[service.pricing_type] || service.pricing_type}</Badge>
            {service.base_price && <span>{service.base_price} kr{service.unit ? ` / ${service.unit}` : ""}</span>}
            {service.calculator_steps?.length > 0 && <span>· {service.calculator_steps.length} beregnertrin</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>Rediger</Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </CardContent>
      {editing && (
        <CardContent className="border-t border-border/50 pt-4">
          <ServiceForm businessId={service.business_id} existingService={service} onClose={() => setEditing(false)} />
        </CardContent>
      )}
    </Card>
  );
};

const SUBCATEGORIES: Record<string, string[]> = {
  "Rengøring": ["Privatrengøring", "Erhvervsrengøring", "Bofællesskaber", "Trappevask", "Vinduespolering"],
  "Håndværker": ["Tømrer", "Snedker", "Murer", "Gulvlægning", "Renovering"],
  "Flyttehjælp": ["Privat flytning", "Erhvervsflytning", "Pianoflytning", "Opbevaring"],
  "Haveservice": ["Havevedligehold", "Anlægsarbejde", "Træfældning", "Hækkeklipning"],
  "Maler": ["Indvendig maling", "Udvendig maling", "Tapetsering", "Facaderenovering"],
  "VVS": ["Blikkenslager", "Vandinstallation", "Varmeinstallation", "Kloakarbejde"],
  "Elektriker": ["Elinstallation", "Fejlfinding", "EL-tjek", "Belysning"],
  "Sikkerhed": ["Alarmsystemer", "Videoovervågning", "Adgangskontrol", "Vagt"],
};

const ServiceForm = ({ businessId, existingService, onClose }: { businessId: string; existingService?: any; onClose: () => void }) => {
  const createService = useCreateService();
  const updateService = useUpdateService();
  const upsertSteps = useUpsertCalculatorSteps();
  const [name, setName] = useState(existingService?.name || "");
  const [description, setDescription] = useState(existingService?.description || "");
  const [subcategory, setSubcategory] = useState(existingService?.subcategory || "");
  const [imageUrl, setImageUrl] = useState(existingService?.image_url || "");
  const [pricingType, setPricingType] = useState(existingService?.pricing_type || "fast_pris");
  const [basePrice, setBasePrice] = useState(existingService?.base_price?.toString() || "");
  const [unit, setUnit] = useState(existingService?.unit || "");
  const [steps, setSteps] = useState<any[]>(existingService?.calculator_steps || []);

  const addStep = () => {
    setSteps([...steps, { label: "", unit: "stk", price_per_unit: 0, min_value: 1, max_value: 100, default_value: 1, sort_order: steps.length }]);
  };
  const updateStep = (i: number, field: string, value: any) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: value };
    setSteps(updated);
  };
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Indtast et servicenavn"); return; }
    try {
      if (existingService) {
        await updateService.mutateAsync({ id: existingService.id, name: name.trim(), description: description.trim() || null, pricing_type: pricingType as any, base_price: basePrice ? parseFloat(basePrice) : null, unit: unit || null });
        if (pricingType === "prisberegner") {
          await upsertSteps.mutateAsync({ serviceId: existingService.id, steps: steps.map((s, i) => ({ service_id: existingService.id, label: s.label, unit: s.unit, price_per_unit: parseFloat(s.price_per_unit) || 0, min_value: parseFloat(s.min_value) || 1, max_value: parseFloat(s.max_value) || 100, default_value: parseFloat(s.default_value) || 1, sort_order: i })) });
        }
        toast.success("Service opdateret");
      } else {
        const result = await createService.mutateAsync({ business_id: businessId, name: name.trim(), description: description.trim() || null, pricing_type: pricingType as any, base_price: basePrice ? parseFloat(basePrice) : null, unit: unit || null });
        if (pricingType === "prisberegner" && steps.length > 0) {
          await upsertSteps.mutateAsync({ serviceId: result.id, steps: steps.map((s, i) => ({ service_id: result.id, label: s.label, unit: s.unit, price_per_unit: parseFloat(s.price_per_unit) || 0, min_value: parseFloat(s.min_value) || 1, max_value: parseFloat(s.max_value) || 100, default_value: parseFloat(s.default_value) || 1, sort_order: i })) });
        }
        toast.success("Service oprettet");
      }
      onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Servicenavn" value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Select value={pricingType} onValueChange={setPricingType}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="fast_pris">Fast pris</SelectItem>
          <SelectItem value="timepris">Timepris</SelectItem>
          <SelectItem value="prisberegner">Prisberegner</SelectItem>
        </SelectContent>
      </Select>
      {(pricingType === "fast_pris" || pricingType === "timepris") && (
        <div className="flex gap-2">
          <Input type="number" placeholder={pricingType === "fast_pris" ? "Pris (kr)" : "Timepris (kr)"} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          {pricingType === "timepris" && <Input placeholder="Enhed (fx timer)" value={unit} onChange={(e) => setUnit(e.target.value)} />}
        </div>
      )}
      {pricingType === "prisberegner" && (
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Beregnertrin</h4>
            <Button variant="outline" size="sm" onClick={addStep}><Plus className="mr-1 h-3 w-3" /> Tilføj trin</Button>
          </div>
          {steps.map((step, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <Input placeholder="Label" value={step.label} onChange={(e) => updateStep(i, "label", e.target.value)} />
              <Input placeholder="Enhed" value={step.unit} onChange={(e) => updateStep(i, "unit", e.target.value)} />
              <Input type="number" placeholder="Pris/enhed" value={step.price_per_unit} onChange={(e) => updateStep(i, "price_per_unit", e.target.value)} />
              <Input type="number" placeholder="Max" value={step.max_value} onChange={(e) => updateStep(i, "max_value", e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {steps.length === 0 && <p className="text-sm text-muted-foreground">Tilføj mindst ét trin til prisberegneren.</p>}
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {existingService ? "Gem ændringer" : "Opret service"}
        </Button>
        <Button variant="outline" onClick={onClose}>Annuller</Button>
      </div>
    </div>
  );
};

// Orders Tab
const OrdersTab = ({ businessId }: { businessId: string }) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const updateStatus = useUpdateOrderStatus();
  const statusLabels: Record<string, string> = { pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang", completed: "Afsluttet", cancelled: "Annulleret" };
  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", in_progress: "bg-purple-100 text-purple-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  if (isLoading) return <p className="text-muted-foreground">Indlæser ordrer...</p>;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Ordrer ({orders?.length || 0})</h2>
      <div className="space-y-3">
        {orders?.map((order) => (
          <Card key={order.id} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{order.customer_name}</h3>
                  <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{order.total_amount} kr</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("da-DK")}</p>
                  {(order as any).order_items?.map((item: any) => (
                    <p key={item.id} className="text-xs text-muted-foreground">• {item.service_name} ({item.total_price} kr)</p>
                  ))}
                </div>
                <Select value={order.status} onValueChange={(val) => updateStatus.mutate({ id: order.id, status: val })}>
                  <SelectTrigger className="w-36">
                    <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!orders || orders.length === 0) && <p className="py-8 text-center text-muted-foreground">Ingen ordrer endnu.</p>}
      </div>
    </div>
  );
};

// Quotes Tab
const QuotesTab = ({ business }: { business: any }) => {
  const { data: quoteRequests, isLoading } = useQuoteRequests(business.category);
  const { data: myQuotes } = useMyQuotes(business.id);
  const createQuote = useCreateQuote();
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  const respondedIds = new Set(myQuotes?.map((q: any) => q.quote_request_id) || []);

  const handleSendQuote = async (requestId: string) => {
    if (!price) { toast.error("Indtast en pris"); return; }
    try {
      await createQuote.mutateAsync({
        quote_request_id: requestId,
        business_id: business.id,
        price: parseFloat(price),
        message: message.trim() || null,
      });
      toast.success("Tilbud sendt!");
      setActiveRequest(null);
      setPrice("");
      setMessage("");
    } catch (e: any) { toast.error(e.message); }
  };

  if (!business.category) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Vælg en kategori i indstillinger for at se relevante tilbudsanmodninger.</p>
      </div>
    );
  }

  if (isLoading) return <p className="text-muted-foreground">Indlæser tilbudsanmodninger...</p>;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Tilbudsanmodninger i {business.category}</h2>
      <div className="space-y-3">
        {quoteRequests?.map((req: any) => (
          <Card key={req.id} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{req.customer_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{req.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("da-DK")}</p>
                </div>
                {respondedIds.has(req.id) ? (
                  <Badge className="bg-green-100 text-green-800">Besvaret</Badge>
                ) : (
                  <Button size="sm" onClick={() => setActiveRequest(activeRequest === req.id ? null : req.id)} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Send className="h-3 w-3" /> Afgiv tilbud
                  </Button>
                )}
              </div>
              {activeRequest === req.id && (
                <div className="mt-4 space-y-3 rounded-lg border border-border/50 p-4">
                  <Input type="number" placeholder="Din pris (kr)" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <Textarea placeholder="Besked til kunden (valgfrit)" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={() => handleSendQuote(req.id)} disabled={createQuote.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {createQuote.isPending ? "Sender..." : "Send tilbud"}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveRequest(null)}>Annuller</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!quoteRequests || quoteRequests.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">Ingen åbne tilbudsanmodninger i din kategori.</p>
        )}
      </div>
    </div>
  );
};

// Settings Tab
const SettingsTab = ({ business }: { business: any }) => {
  const updateBiz = useUpdateBusiness();
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [email, setEmail] = useState(business.email || "");
  const [address, setAddress] = useState(business.address || "");
  const [city, setCity] = useState(business.city || "");
  const [category, setCategory] = useState(business.category || "");

  const handleSave = () => {
    updateBiz.mutate({
      id: business.id,
      name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      category: category || null,
    } as any, {
      onSuccess: () => toast.success("Indstillinger gemt"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 text-xl font-bold text-foreground">Virksomhedsindstillinger</h2>
      <div className="space-y-4">
        <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Vælg kategori" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="By" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button onClick={handleSave} disabled={updateBiz.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {updateBiz.isPending ? "Gemmer..." : "Gem indstillinger"}
        </Button>
      </div>
    </div>
  );
};

export default Admin;
