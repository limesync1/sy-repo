import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <section className="relative overflow-hidden bg-foreground">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(184_90%_42%/0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(184_90%_42%/0.08),transparent_50%)]" />

      <div className="container relative mx-auto px-4 pt-8 pb-24 md:pt-12 md:pb-32">
        <nav className="mb-16 flex items-center justify-between md:mb-24">
          <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-11" />
          <Link to="/auth">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              Log ind
            </Button>
          </Link>
        </nav>

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Danmarks nye platform for services
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
            Find den rette service
            <span className="text-accent"> – hurtigt og nemt</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/60 md:text-xl">
            Sammenlign priser, læs anmeldelser og book de bedste serviceydere i hele Danmark.
          </p>

          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hvad har du brug for?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-13 rounded-xl border-white/10 bg-white pl-11 text-base text-foreground shadow-lg placeholder:text-muted-foreground focus-visible:ring-accent"
              />
            </div>
            <Button
              size="lg"
              onClick={handleSearch}
              className="h-13 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg hover:bg-accent/90"
            >
              Søg
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <Link
                key={s}
                to={`/search?category=${encodeURIComponent(s)}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur transition-all hover:border-accent/40 hover:text-white hover:bg-white/10"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
