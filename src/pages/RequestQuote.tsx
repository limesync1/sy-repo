import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Input removed — not used on this page
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8" />
            </Link>
          </div>
          <Link to="/auth">
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">Log ind</Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Find dine 3 bedste tilbud</h1>
            <p className="text-muted-foreground">
              Beskriv dit behov og vores AI finder de bedste serviceydere til dig – med det samme.
            </p>
          </div>

          {/* Form - always shown when no results */}
          {!matches && (
            <Card className="mx-auto max-w-lg border-border">
              <CardContent className="p-6">
                <form onSubmit={handleFind} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Kategori</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Hvad har du brug for?" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Beskriv dit behov</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Fx: Jeg har brug for rengøring af 3-værelses lejlighed, 85m², hver 14. dag. Ligger i København NV."
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-foreground text-background text-base font-semibold hover:bg-foreground/90"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Finder bedste matches...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Find tilbud med AI
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Analyserer dit behov...</p>
                <p className="text-sm text-muted-foreground">Finder de bedste serviceydere i {category}</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-4 text-foreground">{error}</p>
              <Button variant="outline" onClick={handleReset}>Prøv igen</Button>
            </div>
          )}

          {/* Results */}
          {matches && matches.length > 0 && !isLoading && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Vi fandt {matches.length} {matches.length === 1 ? "match" : "matches"} til dig
                </p>
              </div>

              <div className="space-y-4">
                {matches.map((match, i) => (
                  <Card key={match.business_id} className="overflow-hidden border-border transition-all hover:shadow-lg">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Left: rank + image */}
                        <div className="relative flex items-center justify-center bg-secondary/50 p-6 md:w-32">
                          <div className="text-center">
                            <div className="text-4xl font-black text-foreground">#{i + 1}</div>
                            <div className="mt-1 text-xs font-medium text-accent">{match.match_score}% match</div>
                          </div>
                        </div>

                        {/* Right: info */}
                        <div className="flex-1 p-6">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold text-foreground">{match.business.name}</h3>
                              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                {match.business.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" /> {match.business.city}
                                  </span>
                                )}
                                {match.business.avg_rating && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
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
                              <div className="text-lg font-bold text-foreground">{match.estimated_price}</div>
                              <div className="text-xs text-muted-foreground">Estimeret pris</div>
                            </div>
                          </div>

                          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                            {match.reason}
                          </p>

                          {match.business.services.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-1.5">
                              {match.business.services.slice(0, 4).map((s) => (
                                <Badge key={s.id} variant="outline" className="text-xs">
                                  {s.name}
                                  {s.subcategory && ` · ${s.subcategory}`}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <Link to={`/b/${match.business.slug}`}>
                            <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                              Se virksomhed & bestil
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={handleReset} className="gap-2">
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
