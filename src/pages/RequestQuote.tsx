import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Star, MapPin, BadgeCheck, Loader2, AlertCircle, Wand2 } from "lucide-react";
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
    <div className="relative min-h-screen overflow-hidden bg-foreground">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-magic-bg-1 absolute -left-1/4 -top-1/4 h-[80vh] w-[80vh] rounded-full bg-[radial-gradient(circle,hsl(184_90%_42%/0.15),transparent_60%)] blur-3xl" />
        <div className="animate-magic-bg-2 absolute -right-1/4 top-1/3 h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,hsl(260_80%_60%/0.12),transparent_60%)] blur-3xl" />
        <div className="animate-magic-bg-3 absolute -bottom-1/4 left-1/3 h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,hsl(184_90%_42%/0.1),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(222_47%_11%/0.6))]" />
      </div>

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(184 90% 42%) 1px, transparent 1px), linear-gradient(90deg, hsl(184 90% 42%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-float absolute h-1 w-1 rounded-full bg-accent/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-white/50 transition-colors hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <Link to="/auth">
            <Button size="sm" className="border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/20">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-10 text-center animate-fade-in">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-[0_0_40px_hsl(184_90%_42%/0.2)] backdrop-blur">
              <Wand2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Find dine <span className="bg-gradient-to-r from-accent to-[hsl(260,80%,70%)] bg-clip-text text-transparent">3 bedste tilbud</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-white/50 md:text-lg">
              Beskriv dit behov og vores AI finder de bedste serviceydere til dig – med det samme.
            </p>
          </div>

          {/* Form */}
          {!matches && !isLoading && (
            <div className="mx-auto max-w-lg animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <form onSubmit={handleFind} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/70">Kategori</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:ring-accent/50">
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
                    <label className="mb-1.5 block text-sm font-medium text-white/70">Beskriv dit behov</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Fx: Jeg har brug for rengøring af 3-værelses lejlighed, 85m², hver 14. dag."
                      className="min-h-[130px] border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-accent/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-accent to-[hsl(200,80%,50%)] text-white text-base font-semibold shadow-[0_0_30px_hsl(184_90%_42%/0.3)] transition-all hover:shadow-[0_0_40px_hsl(184_90%_42%/0.5)] hover:brightness-110"
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
                <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 shadow-[0_0_60px_hsl(184_90%_42%/0.3)] backdrop-blur">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Analyserer dit behov...</p>
                <p className="mt-1 text-white/40">Finder de bedste serviceydere i {category}</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur animate-fade-in">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-white/40" />
              <p className="mb-4 text-white/70">{error}</p>
              <Button variant="outline" onClick={handleReset} className="border-white/10 text-white hover:bg-white/10">Prøv igen</Button>
            </div>
          )}

          {/* Results */}
          {matches && matches.length > 0 && !isLoading && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <p className="text-sm font-medium text-white/40">
                  Vi fandt {matches.length} {matches.length === 1 ? "match" : "matches"} til dig
                </p>
              </div>

              <div className="space-y-4">
                {matches.map((match, i) => (
                  <div
                    key={match.business_id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-accent/30 hover:bg-white/[0.08] hover:shadow-[0_0_40px_hsl(184_90%_42%/0.1)]"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Rank */}
                      <div className="relative flex items-center justify-center border-b border-white/5 bg-white/[0.03] p-6 md:w-32 md:border-b-0 md:border-r">
                        <div className="text-center">
                          <div className="bg-gradient-to-b from-accent to-[hsl(260,80%,70%)] bg-clip-text text-5xl font-black text-transparent">
                            #{i + 1}
                          </div>
                          <div className="mt-1.5 rounded-full bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent">
                            {match.match_score}% match
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-6">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-white">{match.business.name}</h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/40">
                              {match.business.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {match.business.city}
                                </span>
                              )}
                              {match.business.avg_rating && (
                                <span className="flex items-center gap-1 text-accent">
                                  <Star className="h-3.5 w-3.5 fill-accent" />
                                  {match.business.avg_rating} ({match.business.review_count})
                                </span>
                              )}
                              {match.business.is_verified && (
                                <span className="flex items-center gap-1 text-accent">
                                  <BadgeCheck className="h-3.5 w-3.5" /> Verificeret
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">{match.estimated_price}</div>
                            <div className="text-xs text-white/30">Estimeret pris</div>
                          </div>
                        </div>

                        <p className="mb-4 text-sm leading-relaxed text-white/50">
                          {match.reason}
                        </p>

                        {match.business.services.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {match.business.services.slice(0, 4).map((s) => (
                              <Badge key={s.id} variant="outline" className="border-white/10 bg-white/5 text-xs text-white/60">
                                {s.name}
                                {s.subcategory && ` · ${s.subcategory}`}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Link to={`/b/${match.business.slug}`}>
                          <Button className="gap-2 bg-gradient-to-r from-accent to-[hsl(200,80%,50%)] text-white shadow-[0_0_20px_hsl(184_90%_42%/0.2)] transition-all hover:shadow-[0_0_30px_hsl(184_90%_42%/0.4)] hover:brightness-110">
                            Se virksomhed & bestil
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-4">
                <Button variant="outline" onClick={handleReset} className="gap-2 border-white/10 text-white hover:bg-white/10">
                  <Sparkles className="h-4 w-4" />
                  Søg igen med nye kriterier
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
