import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Sparkles, Star, MapPin, BadgeCheck, Loader2,
  AlertCircle, ShoppingCart, Check, ChevronLeft, Clock, ShieldCheck,
  Zap, Wrench, Truck, TreePine, Paintbrush, Droplets, Lock, Hammer, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import CartSheet from "@/components/business/CartSheet";
import SEO from "@/components/SEO";
import LocationChip from "@/components/LocationChip";
import RadiusPicker from "@/components/RadiusPicker";
import SiteNav from "@/components/SiteNav";
import { useUserLocation } from "@/contexts/LocationContext";

const CATEGORIES: { label: string; icon: typeof Sparkles }[] = [
  { label: "Rengøring", icon: Sparkles },
  { label: "Håndværker", icon: Wrench },
  { label: "Flyttehjælp", icon: Truck },
  { label: "Haveservice", icon: TreePine },
  { label: "Maler", icon: Paintbrush },
  { label: "VVS", icon: Droplets },
  { label: "Elektriker", icon: Zap },
  { label: "Tømrer", icon: Hammer },
  { label: "Sikkerhed", icon: Lock },
];

const EXAMPLE_PROMPTS: Record<string, string> = {
  "Rengøring": "Fx: Rengøring af 3-værelses lejlighed på 85 m², hver 14. dag i København NV.",
  "Håndværker": "Fx: Skifte 2 toiletter og opsætte 4 hylder i badeværelset, Aarhus C.",
  "Flyttehjælp": "Fx: Flytning fra 2-værelses i Odense til 3-værelses i Vejle, lørdag den 5.",
  "Haveservice": "Fx: Klipning af 200 m² hæk og slåning af 400 m² græsplæne, hver måned.",
  "Maler": "Fx: Maling af stue og soveværelse, ca. 50 m² væg, lyse farver, indvendigt.",
  "VVS": "Fx: Skift af utæt vandhane i køkken og inspektion af afløb i badeværelse.",
  "Elektriker": "Fx: Installation af 4 LED-lofthængslede lamper og udskiftning af 2 stikkontakter.",
  "Tømrer": "Fx: Bygge en træterrasse på 25 m² i baghaven med trapper.",
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
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<MatchedBusiness | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const { count } = useCart();
  const { user } = useAuth();
  const { location, radiusKm } = useUserLocation();

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description.trim()) {
      toast.error("Vælg en kategori og beskriv dit behov");
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
    interval_options: s.interval_options || ["engangskøb"],
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
        canonicalPath="/quote"
        keywords={`få tilbud, ${category || "serviceydere"}, AI matchning, gratis tilbud, danmark, sammenlign serviceydere`}
      />
      {/* Sticky light nav — shared site nav with working mobile menu */}
      <SiteNav
        active="quote"
        right={
          <>
            {count > 0 && <CartSheet />}
            {user && (
              <Link to="/dashboard" className="hidden sm:inline-block">
                <Button size="sm" className="rounded-full bg-foreground font-semibold text-background hover:bg-foreground/90">Mit panel</Button>
              </Link>
            )}
          </>
        }
      />

      {/* ─── STEP 1: Hero + form ─── */}
      {!matches && !isLoading && !selectedBusiness && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-16 md:pb-20">
          {/* Headline */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3 w-3" />
              AI-drevet matching
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-[3.5rem]">
              Beskriv opgaven – <span className="text-accent">vores AI</span> finder folkene.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Få op til 3 skræddersyede tilbud fra verificerede serviceydere. Helt gratis & uforpligtende —
              klar på <span className="font-semibold text-foreground">3-10 sekunder</span>.
            </p>
          </div>

          {/* Form card */}
          <form onSubmit={handleFind} className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8">
            {/* Location strip */}
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/50 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Din lokation:</span>
              <LocationChip />
              <RadiusPicker />
              <span className="ml-auto text-[11px] text-muted-foreground">Vi finder udbydere inden for din valgte radius</span>
            </div>

            {/* Step 1: Category */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">1</span>
                <label className="text-sm font-semibold text-foreground">Vælg kategori</label>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
                {CATEGORIES.map(({ label, icon: Icon }) => {
                  const active = category === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCategory(label)}
                      className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                        active
                          ? "border-foreground bg-foreground text-background shadow-md"
                          : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "" : "text-foreground/70"}`} />
                      <span className="text-[11px] font-medium leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Description */}
            <div className="mt-7">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  category ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}>2</span>
                <label className="text-sm font-semibold text-foreground">Beskriv dit behov</label>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={category ? EXAMPLE_PROMPTS[category] : "Vælg først en kategori ovenfor — så hjælper vi med en god skabelon."}
                disabled={!category}
                className="min-h-[140px] resize-none rounded-2xl border-border text-sm focus-visible:ring-foreground/20 disabled:opacity-60"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Jo mere konkret du er (m², antal, lokation, frekvens), jo bedre bliver matchet.
              </p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!category || !description.trim()}
              className="mt-7 h-14 w-full gap-2 rounded-2xl bg-foreground text-base font-semibold text-background hover:bg-foreground/90 active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5" />
              Find tilbud med AI
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Trust footer in form */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent" /> 3-10 sek.</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Verificerede udbydere</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Gratis & uforpligtende</span>
            </div>
          </form>

          {/* How it works strip */}
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { n: 1, title: "Beskriv opgaven", text: "Vælg kategori og fortæl kort, hvad du har brug for." },
              { n: 2, title: "AI matcher", text: "Vores AI finder de bedste 3 udbydere på sekunder." },
              { n: 3, title: "Sammenlign & vælg", text: "Tilpas pris, læs anmeldelser og book direkte." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">{s.n}</div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Loading ─── */}
      {isLoading && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
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
        <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-2xl border border-border bg-card p-8 text-center animate-fade-in">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-4 text-foreground">{error}</p>
            <Button variant="outline" onClick={handleReset} className="rounded-full">Prøv igen</Button>
          </div>
        </section>
      )}

      {/* ─── STEP 2: Pick a business ─── */}
      {matches && matches.length > 0 && !isLoading && !selectedBusiness && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 animate-fade-in">
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
                  className={`group block w-full overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995] ${
                    isTop ? "border-accent/30 shadow-md ring-1 ring-accent/10" : "border-border hover:border-foreground/20"
                  }`}
                >
                  {isTop && (
                    <div className="flex items-center gap-1.5 bg-accent/10 px-5 py-1.5 text-xs font-semibold text-accent">
                      <Sparkles className="h-3 w-3" /> Bedste match for dig
                    </div>
                  )}

                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                    {/* Cover with logo overlay */}
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-28 sm:w-28">
                      {match.business.cover_image_url ? (
                        <img src={match.business.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                          <Building2 className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {match.business.logo_url && match.business.cover_image_url && (
                        <div className="absolute bottom-1.5 left-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-1 shadow-md">
                          <img src={match.business.logo_url} alt="" className="h-full w-full object-contain" />
                        </div>
                      )}
                      {match.business.logo_url && !match.business.cover_image_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-card p-3">
                          <img src={match.business.logo_url} alt="" className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>

                    {/* Main */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {match.business.logo_url && match.business.cover_image_url && (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card p-0.5 sm:hidden">
                                <img src={match.business.logo_url} alt="" className="h-full w-full object-contain" />
                              </div>
                            )}
                            <h3 className="truncate text-lg font-bold text-foreground">{match.business.name}</h3>
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

                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">{match.estimated_price}</div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimeret</div>
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
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => setSelectedBusiness(null)}
            className="-ml-2 mb-5 gap-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Tilbage til resultater
          </Button>

          {/* Business header */}
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-start gap-4">
              {selectedBusiness.business.logo_url ? (
                <img src={selectedBusiness.business.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-border bg-card object-contain p-1.5" />
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
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
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
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.99]"
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

          {/* Cart sticky bar */}
          {count > 0 && (
            <div className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{count} {count === 1 ? "service" : "services"} i kurven</p>
                    <p className="text-xs text-muted-foreground">fra {selectedBusiness.business.name}</p>
                  </div>
                </div>
                <CartSheet />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default RequestQuote;
