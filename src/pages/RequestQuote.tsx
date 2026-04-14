import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Star, MapPin, BadgeCheck, Loader2, AlertCircle, ShoppingCart, Check, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import CartSheet from "@/components/business/CartSheet";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

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
  const { count, setCartBusiness, businessId } = useCart();

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
        body: { category, description: description.trim() },
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
    setCartBusiness(match.business.id, match.business.name);
  };

  // Convert matched service to the shape DynamicServiceCard expects
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
    service_category: null,
    sort_order: 0,
    interval_options: ["engangskøb"] as string[],
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-magic-bg-1 absolute -left-[15%] -top-[20%] h-[600px] w-[600px] rounded-full bg-[hsl(184,90%,80%)] opacity-40 blur-[140px]" />
        <div className="animate-magic-bg-2 absolute -right-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-[hsl(184,70%,85%)] opacity-30 blur-[130px]" />
        <div className="animate-magic-bg-3 absolute -bottom-[15%] left-[20%] h-[550px] w-[550px] rounded-full bg-[hsl(190,80%,82%)] opacity-25 blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && <CartSheet />}
            <Link to="/auth">
              <Button size="sm" variant="outline">Log ind</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">

          {/* ─── STEP 1: Search form ─── */}
          {!matches && !isLoading && !selectedBusiness && (
            <>
              <div className="mb-10 text-center animate-fade-in">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                  <Sparkles className="h-4 w-4" />
                  AI-drevet matching
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                  Find dine 3 bedste tilbud
                </h1>
                <p className="mx-auto max-w-md text-base text-muted-foreground md:text-lg">
                  Beskriv dit behov — vores AI matcher dig med de bedste serviceydere.
                </p>
              </div>

              <div className="mx-auto max-w-md animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-accent/[0.03] backdrop-blur-sm md:p-8">
                  <form onSubmit={handleFind} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Kategori</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Hvad har du brug for?" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Beskriv dit behov</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Fx: Rengøring af 3-værelses lejlighed, 85m², hver 14. dag i København NV."
                        className="min-h-[120px] rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-accent text-accent-foreground text-base font-semibold shadow-[0_4px_20px_hsl(184_90%_42%/0.2)] transition-all hover:shadow-[0_4px_28px_hsl(184_90%_42%/0.35)] hover:brightness-105"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Find tilbud med AI
                      </span>
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* ─── Loading ─── */}
          {isLoading && (
            <div className="mt-12 flex flex-col items-center gap-6 text-center animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent/20 bg-accent/5 shadow-[0_0_40px_hsl(184_90%_42%/0.15)]">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground">Analyserer dit behov...</p>
                <p className="mt-1 text-muted-foreground">Finder de bedste serviceydere i {category}</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent/50" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* ─── Error ─── */}
          {error && !isLoading && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center animate-fade-in">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-4 text-foreground">{error}</p>
              <Button variant="outline" onClick={handleReset}>Prøv igen</Button>
            </div>
          )}

          {/* ─── STEP 2: Pick a business ─── */}
          {matches && matches.length > 0 && !isLoading && !selectedBusiness && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                  <Sparkles className="h-4 w-4" />
                  {matches.length} {matches.length === 1 ? "match fundet" : "matches fundet"}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-foreground">Vælg en serviceudbyder</h2>
                <p className="mt-1 text-muted-foreground">Vælg den virksomhed du vil bruge — derefter kan du sammensætte dine services.</p>
              </div>

              <div className="space-y-4">
                {matches.map((match, i) => {
                  const isTop = i === 0;
                  const activeServices = match.business.services.filter(s => s.is_active !== false);
                  return (
                    <button
                      key={match.business_id}
                      onClick={() => handleSelectBusiness(match)}
                      className={`group w-full text-left overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300 ${
                        isTop
                          ? "border-accent/25 shadow-lg shadow-accent/[0.06]"
                          : "border-border/60 hover:border-accent/15 hover:shadow-md"
                      }`}
                    >
                      {isTop && (
                        <div className="h-0.5 w-full bg-gradient-to-r from-accent to-[hsl(200,80%,55%)]" />
                      )}

                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                        {/* Rank */}
                        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-1">
                          <span className={`text-3xl font-black ${isTop ? "text-accent" : "text-muted-foreground/30"}`}>
                            #{i + 1}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isTop ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                          }`}>
                            {match.match_score}%
                          </span>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {match.business.logo_url ? (
                              <img src={match.business.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border object-contain bg-background p-1" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-bold text-muted-foreground">
                                {match.business.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-bold text-foreground">{match.business.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {match.business.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {match.business.city}
                                  </span>
                                )}
                                {match.business.avg_rating && (
                                  <span className="flex items-center gap-1 text-accent">
                                    <Star className="h-3 w-3 fill-accent" /> {match.business.avg_rating}
                                    <span className="text-muted-foreground">({match.business.review_count})</span>
                                  </span>
                                )}
                                {match.business.is_verified && (
                                  <span className="flex items-center gap-1 text-accent">
                                    <BadgeCheck className="h-3 w-3" /> Verificeret
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-foreground">{match.estimated_price}</span>
                            <span className="text-xs text-muted-foreground">estimeret</span>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {match.reason}
                          </p>

                          {activeServices.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {activeServices.slice(0, 5).map((s) => (
                                <Badge key={s.id} variant="secondary" className="text-xs font-normal">
                                  {s.name}
                                  {s.pricing_type === "fast_pris" && s.base_price ? ` · ${s.base_price} kr` : ""}
                                </Badge>
                              ))}
                              {activeServices.length > 5 && (
                                <Badge variant="secondary" className="text-xs font-normal">+{activeServices.length - 5}</Badge>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-accent group-hover:underline">
                            Vælg og tilpas services
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-center pt-2">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Søg igen
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Configure services from selected business ─── */}
          {selectedBusiness && !isLoading && (
            <div className="space-y-6 animate-fade-in">
              {/* Back to results */}
              <Button
                variant="ghost"
                onClick={() => setSelectedBusiness(null)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Tilbage til resultater
              </Button>

              {/* Business header */}
              <div className="rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  {selectedBusiness.business.logo_url ? (
                    <img src={selectedBusiness.business.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-contain bg-background p-1" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-xl font-bold text-muted-foreground">
                      {selectedBusiness.business.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedBusiness.business.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {selectedBusiness.business.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedBusiness.business.city}</span>
                      )}
                      {selectedBusiness.business.avg_rating && (
                        <span className="flex items-center gap-1 text-accent">
                          <Star className="h-3.5 w-3.5 fill-accent" /> {selectedBusiness.business.avg_rating}
                        </span>
                      )}
                      {selectedBusiness.business.is_verified && (
                        <span className="flex items-center gap-1 text-accent"><BadgeCheck className="h-3.5 w-3.5" /> Verificeret</span>
                      )}
                      <Badge variant="secondary" className="text-xs">{selectedBusiness.match_score}% match</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedBusiness.reason}</p>
                  </div>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="text-sm text-foreground">
                  <p className="font-medium">Tilpas og tilføj services til din kurv</p>
                  <p className="mt-0.5 text-muted-foreground">Brug prisberegnerne nedenfor til at specificere dit behov og tilføj de services du ønsker.</p>
                </div>
              </div>

              {/* Service cards */}
              {(() => {
                const activeServices = selectedBusiness.business.services.filter(s => s.is_active !== false);
                if (activeServices.length === 0) {
                  return (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <p className="text-muted-foreground">Denne virksomhed har ingen aktive services endnu.</p>
                      <Link to={`/b/${selectedBusiness.business.slug}`} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
                        Besøg virksomhedens side →
                      </Link>
                    </div>
                  );
                }
                return (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {activeServices.map((s) => {
                      const prefill = selectedBusiness?.service_prefills?.find(p => p.service_id === s.id);
                      const stepVals: Record<string, number> = {};
                      prefill?.step_values?.forEach(sv => { stepVals[sv.step_id] = sv.value; });
                      return (
                        <DynamicServiceCard
                          key={s.id}
                          service={toServiceCardProps(s)}
                          initialStepValues={Object.keys(stepVals).length > 0 ? stepVals : undefined}
                          initialHours={prefill?.hours}
                        />
                      );
                    })}
                  </div>
                );
              })()}

              {/* Cart summary bar */}
              {count > 0 && businessId === selectedBusiness.business.id && (
                <div className="sticky bottom-4 z-20 rounded-2xl border border-accent/20 bg-card/95 p-4 shadow-xl backdrop-blur-sm">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestQuote;
