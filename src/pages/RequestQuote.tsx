import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Star, MapPin, BadgeCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Sikkerhed",
];

interface MatchedBusiness {
  business_id: string;
  match_score: number;
  reason: string;
  estimated_price: string;
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
    services: {
      id: string;
      name: string;
      base_price: number | null;
      pricing_type: string;
      subcategory: string | null;
    }[];
  };
}

const RequestQuote = () => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description.trim()) {
      toast.error("Vælg en kategori og beskriv dit behov");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMatches(null);

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
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient orbs — soft pastel on light bg */}
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
          <Link to="/auth">
            <Button size="sm" variant="outline">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
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

          {/* Form */}
          {!matches && !isLoading && (
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
                    disabled={isLoading}
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
          )}

          {/* Loading state */}
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

          {/* Error state */}
          {error && !isLoading && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center animate-fade-in">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-4 text-foreground">{error}</p>
              <Button variant="outline" onClick={handleReset}>Prøv igen</Button>
            </div>
          )}

          {/* Results */}
          {matches && matches.length > 0 && !isLoading && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                  <Sparkles className="h-4 w-4" />
                  {matches.length} {matches.length === 1 ? "match fundet" : "matches fundet"}
                </div>
              </div>

              <div className="space-y-4">
                {matches.map((match, i) => {
                  const isTop = i === 0;
                  return (
                    <div
                      key={match.business_id}
                      className={`group overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300 ${
                        isTop
                          ? "border-accent/25 shadow-lg shadow-accent/[0.06]"
                          : "border-border/60 hover:border-accent/15 hover:shadow-md"
                      }`}
                    >
                      {isTop && (
                        <div className="h-0.5 w-full bg-gradient-to-r from-accent via-[hsl(200,80%,55%)] to-[hsl(260,60%,65%)]" />
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
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {match.business.logo_url ? (
                                <img src={match.business.logo_url} alt="" className="h-11 w-11 rounded-xl border border-border object-contain bg-background p-1" />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-bold text-muted-foreground">
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
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold text-foreground">{match.estimated_price}</div>
                              <div className="text-xs text-muted-foreground">Estimeret</div>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {match.reason}
                          </p>

                          {match.business.services.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {match.business.services.slice(0, 4).map((s) => (
                                <Badge key={s.id} variant="secondary" className="text-xs font-normal">
                                  {s.name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="mt-4">
                            <Link to={`/b/${match.business.slug}`}>
                              <Button size="sm" className={`gap-2 ${
                                isTop
                                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                                  : "bg-foreground text-background hover:bg-foreground/90"
                              }`}>
                                Se virksomhed & bestil
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
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
        </div>
      </div>
    </div>
  );
};

export default RequestQuote;
