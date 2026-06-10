import { useState } from "react";
import { Link } from "react-router-dom";
import { IndustryIcon } from "@/components/IndustryIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Sparkles, Star, MapPin, BadgeCheck, Loader2,
  AlertCircle, ShoppingCart, Check, ChevronLeft, Clock, ShieldCheck,
  Building2, Search, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import SEO from "@/components/SEO";
import LocationChip from "@/components/LocationChip";
import RadiusPicker from "@/components/RadiusPicker";
import SiteNav from "@/components/SiteNav";
import { useUserLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import PageHero from "@/components/landing/PageHero";
import Footer from "@/components/landing/Footer";
import { topCategories } from "@/lib/service-taxonomy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Brug det kanoniske branchekatalog så /tilbud altid matcher
 *  præcis det virksomheder kan registrere sig under. */
const CATEGORIES = topCategories();

const EXAMPLE_PROMPTS: Record<string, string> = {
  "Rengøring": "Fx: Rengøring af 3-værelses lejlighed på 85 m², hver 14. dag i København NV.",
  "Vinduespudsning": "Fx: Vinduespudsning af villa med 18 vinduer, hver måned, ude og inde.",
  "Algebehandling": "Fx: Algebehandling af 120 m² tag på parcelhus i Aarhus.",
  "Haveservice": "Fx: Klipning af 200 m² hæk og slåning af 400 m² græsplæne, hver måned.",
  "Tømrer": "Fx: Bygge en træterrasse på 25 m² i baghaven med trapper.",
  "Murer": "Fx: Reparation af revner i murværk og opmuring af lille trappe ved indgang.",
  "Maler": "Fx: Maling af stue og soveværelse, ca. 50 m² væg, lyse farver, indvendigt.",
  "VVS": "Fx: Skift af utæt vandhane i køkken og inspektion af afløb i badeværelse.",
  "Elektriker": "Fx: Installation af 4 LED-loftslamper og udskiftning af 2 stikkontakter.",
  "Flyttehjælp": "Fx: Flytning fra 2-værelses i Odense til 3-værelses i Vejle, lørdag den 5.",
  "Skadedyrsbekæmpelse": "Fx: Bekæmpelse af rotter i kælder, parcelhus i Roskilde.",
  "Anlægsgartner": "Fx: Anlæg af 60 m² flisebelagt terrasse og plantning af hæk omkring.",
  "Gulvlægger": "Fx: Lægning af 35 m² laminatgulv i stue og spisestue.",
  "Skorstensfejer": "Fx: Årlig fejning af brændeovnsskorsten på parcelhus.",
  "Sikkerhed": "Fx: Montering af 4 udendørs sikkerhedskameraer og alarm til parcelhus.",
};

interface MatchedService {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  pricing_type: string;
  subcategory: string | null;
  image_url: string | null;
  unit: string | null;
  is_active: boolean | null;
  interval_options?: string[];
  service_category?: string | null;
  calculator_steps: {
    id: string;
    label: string;
    unit: string;
    price_per_unit: number;
    min_value: number | null;
    max_value: number | null;
    default_value: number | null;
    sort_order: number | null;
  }[];
}

interface ServicePrefill {
  service_id: string;
  hours?: number;
  step_values?: { step_id: string; value: number }[];
}

interface MatchedBusiness {
  business_id: string;
  match_score: number;
  reason: string;
  estimated_price: string;
  service_prefills?: ServicePrefill[];
  business: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    city: string | null;
    categories?: string[];
    is_verified: boolean;
    logo_url: string | null;
    cover_image_url: string | null;
    avg_rating: number | null;
    review_count: number;
    services: MatchedService[];
  };
}

const RequestQuote = () => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<MatchedBusiness | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const { location, radiusKm } = useUserLocation();
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shareContact, setShareContact] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const selectedCategory = CATEGORIES.find((c) => c.key === category);
  /** Foreslå 3 populære kategorier ved tomt søgefelt så listen ikke
   *  overvælder, men brugeren stadig kan klikke direkte. Når der søges,
   *  vises alle matches. */
  const POPULAR_KEYS = ["Rengøring", "Haveservice", "Vinduespudsning"];
  const trimmedQuery = categoryQuery.trim().toLowerCase();
  const filteredCategories = trimmedQuery
    ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(trimmedQuery))
    : (POPULAR_KEYS
        .map((k) => CATEGORIES.find((c) => c.key === k))
        .filter(Boolean) as typeof CATEGORIES);

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description.trim()) {
      toast.error("Vælg en kategori og beskriv dit behov");
      return;
    }
    const trimmedEmail = customerEmail.trim();
    if (!customerName.trim() || !trimmedEmail) {
      toast.error("Udfyld dit navn og e-mail, så virksomhederne kan kontakte dig");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error("Indtast en gyldig e-mail");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Du skal acceptere vilkår og privatlivspolitik for at fortsætte");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMatches(null);
    setSelectedBusiness(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("match-quotes", {
        body: {
          category,
          description: description.trim(),
          location: (location.city || location.zip)
            ? { city: location.city, zip: location.zip }
            : undefined,
          radius_km: radiusKm,
          customer: {
            name: customerName.trim(),
            email: trimmedEmail,
            phone: customerPhone.trim() || undefined,
            share_contact: shareContact,
          },
          terms_accepted: acceptedTerms,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setMatches(data.matches || []);
      if (data.matches?.length === 0) {
        setError(data.message || "Ingen matches fundet i denne kategori endnu.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Noget gik galt. Prøv igen.");
      toast.error("Fejl ved matching");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMatches(null);
    setError(null);
    setDescription("");
    setCategory("");
    setSelectedBusiness(null);
  };

  const handleSelectBusiness = (match: MatchedBusiness) => {
    setSelectedBusiness(match);
    setShowAllServices(false);
  };

  const toServiceCardProps = (s: MatchedService) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    base_price: s.base_price,
    pricing_type: s.pricing_type as any,
    subcategory: s.subcategory,
    image_url: s.image_url,
    unit: s.unit,
    is_active: s.is_active,
    business_id: selectedBusiness!.business.id,
    created_at: "",
    updated_at: "",
    service_category: s.service_category || null,
    sort_order: 0,
    default_vat_rate: 25,
    accounting_account_number: null,
    accounting_product_group: null,
    accounting_income_account: null,
    product_number: null,
    vat_zone: null,
    interval_options: s.interval_options || ["engangskøb"],
    default_employee_id: null,
    default_employee_ids: [],
    weather_sensitive: false,
    calculator_steps: s.calculator_steps.map((cs) => ({
      id: cs.id,
      label: cs.label,
      unit: cs.unit,
      price_per_unit: cs.price_per_unit,
      min_value: cs.min_value,
      max_value: cs.max_value,
      default_value: cs.default_value,
      sort_order: cs.sort_order,
      service_id: s.id,
      created_at: "",
    })),
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={category ? `Få tilbud på ${category} – AI-matchning` : "Få op til 3 gratis tilbud – AI-matchning"}
        description={category
          ? `Beskriv din opgave og få op til 3 skræddersyede tilbud på ${category} fra verificerede serviceydere. Helt gratis og uforpligtende.`
          : "Beskriv din opgave og få op til 3 skræddersyede tilbud fra verificerede serviceydere i Danmark. Helt gratis og uforpligtende — klar på 3-10 sekunder."}
        canonicalPath="/tilbud"
        keywords={`få tilbud, ${category || "serviceydere"}, AI matchning, gratis tilbud, danmark, sammenlign serviceydere`}
      />
      {/* Sticky light nav — shared site nav with working mobile menu */}
      <SiteNav active="quote" />

      {/* ─── STEP 1: Hero + form ─── */}
      {!matches && !isLoading && !selectedBusiness && (
        <>
          <PageHero
            title="Få op til 3 gratis tilbud."
            subtitle="Beskriv opgaven, så finder vi de bedste serviceydere til dig — gratis og uforpligtende."
          />

          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-12 md:pt-12 md:pb-20">
          {/* Form card */}
          <form onSubmit={handleFind} className="surface-panel mt-4 rounded-[1.5rem] border border-border p-4 shadow-[0_24px_55px_-36px_hsl(var(--foreground)/0.28)] sm:rounded-[2rem] sm:p-6 md:mt-10 md:p-8">
            {/* Step 1: Lokation — fuld step med eget nummer, så det stilmæssigt
                matcher de øvrige trin. */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">1</span>
                <label className="text-sm font-semibold text-foreground">Hvor skal opgaven løses?</label>
              </div>
              <div className="rounded-2xl border border-border bg-card/80 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <LocationChip />
                  <RadiusPicker />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Vi finder udbydere inden for din valgte radius.
                </p>
              </div>
            </div>

            {/* Step 2: Category — søgbar dropdown holder feltet kompakt og lader
                brugeren skrive sig frem i stedet for at scanne 15 ikoner. */}
            <div className="mt-7">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">2</span>
                <label className="text-sm font-semibold text-foreground">Vælg kategori</label>
              </div>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 text-left text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary/40 sm:h-11"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedCategory ? (
                        <>
                          <IndustryIcon category={selectedCategory.key} className="h-5 w-5" alt={selectedCategory.label} />
                          <span className="truncate">{selectedCategory.label}</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Søg eller vælg en kategori…</span>
                        </>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  avoidCollisions={false}
                  className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-border bg-card p-0 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      autoFocus
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      placeholder="Søg fx rengøring, vinduespudsning…"
                      className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {!trimmedQuery && (
                    <div className="border-b border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Populære kategorier
                    </div>
                  )}
                  <ul className="max-h-[260px] overflow-y-auto py-1">
                    {filteredCategories.length === 0 && (
                      <li className="px-4 py-3 text-sm text-muted-foreground">Ingen kategorier matcher.</li>
                    )}
                    {filteredCategories.map(({ label, key, icon }) => {
                      const active = category === key;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory(key);
                              setCategoryOpen(false);
                              setCategoryQuery("");
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                              active ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/60"
                            }`}
                          >
                            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base">{icon}</span>
                            <span className="flex-1 font-medium">{label}</span>
                            {active && <Check className="h-4 w-4 text-accent" />}
                          </button>
                        </li>
                      );
                    })}
                    {!trimmedQuery && (
                      <li className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                        Skriv for at søge blandt alle {CATEGORIES.length} kategorier.
                      </li>
                    )}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>

            {/* Step 3: Description */}
            <div className="mt-7">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  category ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}>3</span>
                <label className="text-sm font-semibold text-foreground">Beskriv dit behov</label>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={category ? EXAMPLE_PROMPTS[category] : "Vælg først en kategori ovenfor — så hjælper vi med en god skabelon."}
                disabled={!category}
                className="min-h-[120px] resize-none rounded-2xl border-border text-base focus-visible:ring-foreground/20 disabled:opacity-60 sm:min-h-[140px] sm:text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Jo mere konkret du er (m², antal, lokation, frekvens), jo bedre bliver matchet.
              </p>
            </div>

            {/* Step 4: Kontaktoplysninger */}
            <div className="mt-7">
              <div className="mb-1 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  description.trim() ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}>4</span>
                <label className="text-sm font-semibold text-foreground">Hvor kan virksomhederne nå dig?</label>
              </div>
              <p className="mb-4 ml-8 text-xs text-muted-foreground">
                Vi sender de bedste matches til din e-mail med det samme.
              </p>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Navn"
                    autoComplete="name"
                    className="h-12 rounded-xl text-base sm:h-11 sm:text-sm"
                  />
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="E-mail"
                    autoComplete="email"
                    inputMode="email"
                    className="h-12 rounded-xl text-base sm:h-11 sm:text-sm"
                  />
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Telefon (valgfrit)"
                    autoComplete="tel"
                    inputMode="tel"
                    className="h-12 rounded-xl text-base sm:col-span-2 sm:h-11 sm:text-sm"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 px-1 text-[13px] leading-5 text-foreground sm:items-center sm:text-xs">
                  <Checkbox
                    checked={shareContact}
                    onCheckedChange={(v) => setShareContact(v === true)}
                    className="mt-0.5 sm:mt-0"
                  />
                  <span>Del mine oplysninger med de matchede virksomheder.</span>
                </label>

                {/* Lovpligtig samtykke — jf. GDPR art. 6(1)(a). Kort form med link til fuld tekst. */}
                <label className="flex cursor-pointer items-start gap-2.5 px-1 text-[13px] leading-5 text-foreground sm:items-center sm:text-xs">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(v === true)}
                    required
                    className="mt-0.5 sm:mt-0"
                  />
                  <span>
                    Jeg accepterer{" "}
                    <Link to="/vilkaar" target="_blank" className="font-medium underline underline-offset-2 hover:text-accent">vilkår</Link>
                    {" & "}
                    <Link to="/privatlivspolitik" target="_blank" className="font-medium underline underline-offset-2 hover:text-accent">privatlivspolitik</Link>.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!category || !description.trim() || !customerName.trim() || !customerEmail.trim() || !acceptedTerms}
              className="mt-6 h-14 w-full gap-2 rounded-2xl bg-foreground text-base font-semibold text-background hover:bg-foreground/90 active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              Find tilbud med AI
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Trust footer in form */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground sm:text-xs sm:gap-x-5">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent" /> 3-10 sek.</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Verificerede udbydere</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Gratis & uforpligtende</span>
            </div>
          </form>

          {/* How it works strip */}
          <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-5 sm:grid-cols-3">
            {[
              { n: 1, title: "Beskriv opgaven", text: "Vælg kategori og fortæl kort, hvad du har brug for." },
              { n: 2, title: "AI matcher", text: "Vores AI finder de bedste 3 udbydere på sekunder." },
              { n: 3, title: "Sammenlign & vælg", text: "Tilpas pris, læs anmeldelser og book direkte." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-[1.5rem] sm:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">{s.n}</div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
          </section>
        </>
      )}

      {/* ─── Loading ─── */}
      {isLoading && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent/20 bg-accent/5 shadow-lg shadow-accent/20">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">AI'en analyserer dit behov...</p>
              <p className="mt-1 text-muted-foreground">Finder de bedste serviceydere i {category}</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent/50" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Error ─── */}
      {error && !isLoading && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-2xl border border-border bg-card p-8 text-center animate-fade-in">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-4 text-foreground">{error}</p>
            <Button variant="outline" onClick={handleReset} className="rounded-full">Prøv igen</Button>
          </div>
        </section>
      )}

      {/* ─── STEP 2: Pick a business ─── */}
      {matches && matches.length > 0 && !isLoading && !selectedBusiness && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 animate-fade-in">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
              <Sparkles className="h-4 w-4" />
              {matches.length} {matches.length === 1 ? "match fundet" : "matches fundet"}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Vælg en serviceudbyder</h2>
            <p className="mx-auto mt-1 max-w-xl text-muted-foreground">
              Vælg den virksomhed du vil bruge — derefter kan du tilpasse og bestille services.
            </p>
          </div>

          <div className="space-y-4">
            {matches.map((match, i) => {
              const isTop = i === 0;
              const activeServices = match.business.services.filter(s => s.is_active !== false);
              return (
                <button
                  key={match.business_id}
                  onClick={() => handleSelectBusiness(match)}
                  className={`group block w-full overflow-hidden rounded-[1.75rem] border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-30px_hsl(var(--foreground)/0.28)] active:scale-[0.995] ${
                    isTop ? "border-accent/30 shadow-md ring-1 ring-accent/10" : "border-border hover:border-foreground/20"
                  }`}
                >
                  {isTop && (
                    <div className="flex items-center gap-1.5 bg-accent/10 px-5 py-1.5 text-xs font-semibold text-accent">
                      <Sparkles className="h-3 w-3" /> Bedste match for dig
                    </div>
                  )}

                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                    {/* Cover with logo overlay */}
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-28 sm:w-28">
                      {match.business.cover_image_url ? (
                        <img
                          src={match.business.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          width={400}
                          height={300}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                          <Building2 className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {match.business.logo_url && match.business.cover_image_url && (
                        <div className="absolute bottom-1.5 left-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-1 shadow-md">
                          <img
                            src={match.business.logo_url}
                            alt=""
                            className="h-full w-full object-contain"
                            width={36}
                            height={36}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                      {match.business.logo_url && !match.business.cover_image_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-card p-3">
                          <img
                            src={match.business.logo_url}
                            alt=""
                            className="h-full w-full object-contain"
                            width={112}
                            height={112}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                    </div>

                    {/* Main */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {match.business.logo_url && match.business.cover_image_url && (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card p-0.5 sm:hidden">
                                <img
                                  src={match.business.logo_url}
                                  alt=""
                                  className="h-full w-full object-contain"
                                  width={28}
                                  height={28}
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            )}
                            <h3 className="min-w-0 truncate text-base font-bold text-foreground sm:text-lg">{match.business.name}</h3>
                            {match.business.is_verified && (
                              <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {match.business.city && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {match.business.city}</span>
                            )}
                            {match.business.avg_rating ? (
                              <span className="flex items-center gap-1 text-foreground">
                                <Star className="h-3 w-3 fill-foreground" /> {match.business.avg_rating}
                                <span className="text-muted-foreground">({match.business.review_count})</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Ny på platformen</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-base font-bold text-foreground sm:text-lg">{match.estimated_price}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">Estimeret</div>
                        </div>
                      </div>

                      {/* Match reason */}
                      <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                          <Sparkles className="h-3 w-3" /> Hvorfor denne — {match.match_score}% match
                        </div>
                        <p className="text-sm leading-snug text-foreground">{match.reason}</p>
                      </div>

                      {/* Service tags */}
                      {activeServices.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activeServices.slice(0, 4).map((s) => (
                            <Badge key={s.id} variant="secondary" className="rounded-full bg-secondary text-xs font-medium text-foreground">
                              {s.name}
                            </Badge>
                          ))}
                          {activeServices.length > 4 && (
                            <Badge variant="secondary" className="rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                              +{activeServices.length - 4} flere
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:gap-2 transition-all">
                        Vælg & tilpas services
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Button variant="outline" onClick={handleReset} className="gap-2 rounded-full">
              <Sparkles className="h-4 w-4" />
              Søg igen
            </Button>
          </div>
        </section>
      )}

      {/* ─── STEP 3: Configure services ─── */}
      {selectedBusiness && !isLoading && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => setSelectedBusiness(null)}
            className="-ml-2 mb-5 gap-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Tilbage til resultater
          </Button>

          {/* Business header */}
          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              {selectedBusiness.business.logo_url ? (
                <img
                  src={selectedBusiness.business.logo_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl border border-border bg-card object-contain p-1.5"
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-xl font-bold text-foreground">
                  {selectedBusiness.business.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-foreground">{selectedBusiness.business.name}</h2>
                  {selectedBusiness.business.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {selectedBusiness.business.city && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedBusiness.business.city}</span>
                  )}
                  {selectedBusiness.business.avg_rating && (
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="h-3.5 w-3.5 fill-foreground" /> {selectedBusiness.business.avg_rating}
                    </span>
                  )}
                  <Badge variant="secondary" className="rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {selectedBusiness.match_score}% match
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-foreground/80">{selectedBusiness.reason}</p>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-accent/20 bg-accent/5 p-4">
            <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Tilpas og tilføj services til din kurv</p>
              <p className="mt-0.5 text-muted-foreground">Brug prisberegnerne til at specificere dit behov, og tilføj de services du ønsker.</p>
            </div>
          </div>

          {/* Service cards */}
          <div className="mt-6">
            {(() => {
              const activeServices = selectedBusiness.business.services.filter(s => s.is_active !== false);
              const prefillIds = (selectedBusiness.service_prefills || []).map(p => p.service_id);
              const matchedServices = prefillIds.length > 0
                ? activeServices.filter(s => prefillIds.includes(s.id))
                : activeServices.slice(0, 1);
              const otherServices = activeServices.filter(s => !matchedServices.some(ms => ms.id === s.id));

              if (activeServices.length === 0) {
                return (
                  <div className="rounded-2xl border border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground">Denne virksomhed har ingen aktive services endnu.</p>
                    <Link to={`/b/${selectedBusiness.business.slug}`} className="mt-3 inline-block text-sm font-semibold text-foreground hover:underline">
                      Besøg virksomhedens side →
                    </Link>
                  </div>
                );
              }

              const renderCard = (s: MatchedService) => {
                const prefill = selectedBusiness?.service_prefills?.find(p => p.service_id === s.id);
                const stepVals: Record<string, number> = {};
                prefill?.step_values?.forEach(sv => { stepVals[sv.step_id] = sv.value; });
                return (
                  <DynamicServiceCard
                    key={s.id}
                    service={toServiceCardProps(s)}
                    initialStepValues={Object.keys(stepVals).length > 0 ? stepVals : undefined}
                    initialHours={prefill?.hours}
                    businessName={selectedBusiness.business.name}
                    businessLogoUrl={selectedBusiness.business.logo_url || undefined}
                  />
                );
              };

              return (
                <div className="space-y-8">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Anbefalet til dig</h3>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {matchedServices.map(renderCard)}
                    </div>
                  </div>

                  {otherServices.length > 0 && (
                    <div>
                      {!showAllServices ? (
                         <button
                          onClick={() => setShowAllServices(true)}
                           className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.99]"
                        >
                          Se {otherServices.length} andre services fra {selectedBusiness.business.name}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Andre services</h3>
                          <div className="grid gap-5 sm:grid-cols-2">
                            {otherServices.map(renderCard)}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Bestillingsoversigten håndteres nu af den globale CartSheet/CartFab,
              så vi viser ikke længere en sticky kurv-bar her — det er overflødigt. */}
        </section>
      )}

      <Footer />
    </div>
  );
};

export default RequestQuote;
