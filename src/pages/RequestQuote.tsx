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
    <div className="relative min-h-screen overflow-hidden bg-[hsl(230,25%,12%)]">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-magic-bg-1 absolute -left-[20%] -top-[10%] h-[700px] w-[700px] rounded-full bg-[hsl(184,90%,42%)] opacity-[0.08] blur-[120px]" />
        <div className="animate-magic-bg-2 absolute -right-[15%] top-[20%] h-[600px] w-[600px] rounded-full bg-[hsl(270,70%,55%)] opacity-[0.07] blur-[120px]" />
        <div className="animate-magic-bg-3 absolute bottom-[-10%] left-[30%] h-[500px] w-[500px] rounded-full bg-[hsl(200,80%,50%)] opacity-[0.06] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/[0.06]">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-white/40 transition-colors hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <Link to="/auth">
            <Button size="sm" className="border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-xl">
          {/* Header */}
          <div className="mb-10 text-center animate-fade-in">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Find dine 3 bedste tilbud
            </h1>
            <p className="mx-auto max-w-sm text-base text-white/40 md:text-lg">
              Beskriv dit behov — vores AI matcher dig med de bedste serviceydere.
            </p>
          </div>

          {/* Form */}
          {!matches && !isLoading && (
            <div className="mx-auto max-w-md animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <form onSubmit={handleFind} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/50">Kategori</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] text-white focus:border-accent/40 focus:ring-1 focus:ring-accent/30">
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
                  <label className="mb-1.5 block text-sm font-medium text-white/50">Beskriv dit behov</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Fx: Rengøring af 3-værelses lejlighed, 85m², hver 14. dag i København NV."
                    className="min-h-[120px] rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 focus-visible:border-accent/40 focus-visible:ring-1 focus-visible:ring-accent/30"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-accent text-white text-base font-semibold shadow-[0_4px_24px_hsl(184_90%_42%/0.25)] transition-all hover:shadow-[0_4px_32px_hsl(184_90%_42%/0.4)] hover:brightness-110"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Find tilbud med AI
                  </span>
                </Button>
              </form>
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
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                  <Sparkles className="h-4 w-4" />
                  {matches.length} {matches.length === 1 ? "match fundet" : "matches fundet"}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {matches.map((match, i) => {
                  const isTop = i === 0;
                  return (
                    <div
                      key={match.business_id}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                        isTop
                          ? "border-accent/30 bg-white/[0.08] shadow-[0_0_40px_hsl(184_90%_42%/0.12)] md:-mt-2 md:mb-2"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      {/* Top accent bar */}
                      {isTop && (
                        <div className="h-1 w-full bg-gradient-to-r from-accent to-[hsl(200,80%,55%)]" />
                      )}

                      <div className="flex flex-1 flex-col p-5">
                        {/* Rank + match score header */}
                        <div className="mb-4 flex items-center justify-between">
                          <span className={`text-3xl font-black ${isTop ? "text-accent" : "text-white/20"}`}>
                            #{i + 1}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isTop ? "bg-accent/15 text-accent" : "bg-white/5 text-white/50"
                          }`}>
                            {match.match_score}% match
                          </span>
                        </div>

                        {/* Logo + name */}
                        <div className="mb-3 flex items-center gap-3">
                          {match.business.logo_url ? (
                            <img src={match.business.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white/60">
                              {match.business.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white">{match.business.name}</h3>
                            {match.business.city && (
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <MapPin className="h-3 w-3" /> {match.business.city}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating + verified */}
                        <div className="mb-3 flex items-center gap-3 text-sm">
                          {match.business.avg_rating && (
                            <span className="flex items-center gap-1 text-accent">
                              <Star className="h-3.5 w-3.5 fill-accent" />
                              {match.business.avg_rating}
                              <span className="text-white/30">({match.business.review_count})</span>
                            </span>
                          )}
                          {match.business.is_verified && (
                            <span className="flex items-center gap-1 text-xs text-accent/80">
                              <BadgeCheck className="h-3.5 w-3.5" /> Verificeret
                            </span>
                          )}
                        </div>

                        {/* Reason */}
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-white/45">
                          {match.reason}
                        </p>

                        {/* Services */}
                        {match.business.services.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {match.business.services.slice(0, 3).map((s) => (
                              <span key={s.id} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price + CTA */}
                        <div className="mt-auto border-t border-white/5 pt-4">
                          <div className="mb-3 flex items-baseline justify-between">
                            <span className="text-xs text-white/30">Estimeret pris</span>
                            <span className="text-lg font-bold text-white">{match.estimated_price}</span>
                          </div>
                          <Link to={`/b/${match.business.slug}`} className="block">
                            <Button className={`w-full gap-2 ${
                              isTop
                                ? "bg-accent text-white hover:bg-accent/90"
                                : "bg-white/10 text-white hover:bg-white/15"
                            }`}>
                              Se virksomhed
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center pt-2">
                <Button variant="outline" onClick={handleReset} className="gap-2 border-white/10 text-white hover:bg-white/10">
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
