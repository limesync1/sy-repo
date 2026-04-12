import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.08),transparent_50%)]" />

      <div className="container relative mx-auto px-4 pt-6 pb-20 md:pt-8 md:pb-28">
        <nav className="mb-12 flex items-center justify-between md:mb-20">
          <div className="flex items-center gap-8">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-11" />
            <div className="hidden items-center gap-6 md:flex">
              <Link to="/search" className="text-sm font-medium text-background/60 transition-colors hover:text-background">
                Find services
              </Link>
              <Link to="/quote" className="text-sm font-medium text-background/60 transition-colors hover:text-background">
                Få tilbud
              </Link>
              <Link to="/search?category=Rengøring" className="text-sm font-medium text-background/60 transition-colors hover:text-background">
                Kategorier
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-block">
              <Button size="sm" className="bg-background text-foreground font-semibold hover:bg-background/90">
                Log ind
              </Button>
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-background/80 transition-colors hover:bg-background/10 md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mb-8 rounded-xl border border-background/10 bg-background/5 p-4 backdrop-blur-sm md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 transition-colors hover:bg-background/10 hover:text-background" onClick={() => setMenuOpen(false)}>
                Find services
              </Link>
              <Link to="/quote" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 transition-colors hover:bg-background/10 hover:text-background" onClick={() => setMenuOpen(false)}>
                Få tilbud
              </Link>
              <Link to="/search?category=Rengøring" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 transition-colors hover:bg-background/10 hover:text-background" onClick={() => setMenuOpen(false)}>
                Kategorier
              </Link>
              <Link to="/auth" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 transition-colors hover:bg-background/10 hover:text-background" onClick={() => setMenuOpen(false)}>
                Log ind
              </Link>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-background md:text-5xl lg:text-6xl">
            Find den rette service
            <span className="text-accent"> – hurtigt og nemt</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-background/60 md:text-xl">
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
                className="h-12 rounded-xl border-background/10 bg-background pl-11 text-base text-foreground shadow-lg placeholder:text-muted-foreground focus-visible:ring-accent"
              />
            </div>
            <Button
              size="lg"
              onClick={handleSearch}
              className="h-12 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg hover:bg-accent/90"
            >
              Søg
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <Link
                key={s}
                to={`/search?category=${encodeURIComponent(s)}`}
                className="rounded-full border border-background/10 bg-background/5 px-4 py-1.5 text-sm text-background/60 backdrop-blur transition-all hover:border-accent/40 hover:text-background hover:bg-background/10"
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
