import { Search, Menu, X, ArrowUpRight, Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const rotatingWords = ["rengøring", "håndværker", "flyttehjælp", "haveservice", "maler"];

const heroCategories = [
  { icon: Sparkles, label: "Rengøring" },
  { icon: Wrench, label: "Håndværker" },
  { icon: Truck, label: "Flytning" },
  { icon: TreePine, label: "Have" },
  { icon: Paintbrush, label: "Maler" },
  { icon: Droplets, label: "VVS" },
];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % rotatingWords.length), 2400);
    return () => clearInterval(id);
  }, []);

  const handleSearch = () => {
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate("/search");
  };

  return (
    <section className="relative overflow-hidden bg-foreground">
      {/* Soft background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-accent/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-16 md:pt-8 md:pb-24">
        <nav className="mb-12 flex items-center justify-between md:mb-16">
          <div className="flex items-center gap-8">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-11" />
            <div className="hidden items-center gap-6 md:flex">
              <Link to="/search" className="text-sm font-medium text-background/60 transition-colors hover:text-background">Find services</Link>
              <Link to="/quote" className="text-sm font-medium text-background/60 transition-colors hover:text-background">Få tilbud</Link>
              <Link to="/search?category=Rengøring" className="text-sm font-medium text-background/60 transition-colors hover:text-background">Kategorier</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-block">
              <Button size="sm" className="bg-background text-foreground font-semibold hover:bg-background/90">Log ind</Button>
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

        {menuOpen && (
          <div className="mb-8 rounded-xl border border-background/10 bg-background/5 p-4 backdrop-blur-sm md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 hover:bg-background/10" onClick={() => setMenuOpen(false)}>Find services</Link>
              <Link to="/quote" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 hover:bg-background/10" onClick={() => setMenuOpen(false)}>Få tilbud</Link>
              <Link to="/search?category=Rengøring" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 hover:bg-background/10" onClick={() => setMenuOpen(false)}>Kategorier</Link>
              <Link to="/auth" className="rounded-lg px-3 py-2 text-sm font-medium text-background/80 hover:bg-background/10" onClick={() => setMenuOpen(false)}>Log ind</Link>
            </div>
          </div>
        )}

        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* LEFT: Editorial headline */}
          <div className="animate-fade-in">
            <h1 className="mb-6 text-5xl font-extrabold leading-[0.95] tracking-tight text-background md:text-6xl lg:text-7xl">
              Find den rette
              <br />
              <span className="relative inline-block">
                <span
                  key={wordIndex}
                  className="inline-block text-accent animate-fade-in"
                >
                  {rotatingWords[wordIndex]}
                </span>
              </span>
              <br />
              <span className="text-background/90">– i dag.</span>
            </h1>

            <p className="mb-8 max-w-lg text-lg text-background/60">
              Sammenlign priser, læs ægte anmeldelser og book Danmarks bedste serviceydere.
            </p>

            <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Hvad har du brug for?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-13 rounded-xl border-background/10 bg-background pl-11 text-base text-foreground shadow-2xl placeholder:text-muted-foreground focus-visible:ring-accent"
                />
              </div>
              <Button
                size="lg"
                onClick={handleSearch}
                className="h-13 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"
              >
                Søg nu
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Link
                  key={s}
                  to={`/search?category=${encodeURIComponent(s)}`}
                  className="rounded-full border border-background/10 bg-background/5 px-3.5 py-1.5 text-sm text-background/60 backdrop-blur transition-all hover:border-accent/50 hover:bg-background/10 hover:text-background"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* RIGHT: Simple category bento */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              {heroCategories.map((cat, i) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className="group relative overflow-hidden rounded-2xl border border-background/10 bg-background/5 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-background/10"
                  style={{ animation: `fade-in 0.5s ease-out ${i * 60}ms both` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/10 text-background transition-all group-hover:bg-accent group-hover:text-accent-foreground">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-background/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <div className="mt-6 text-base font-semibold text-background">{cat.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom marquee ticker */}
      <div className="relative border-t border-background/10 bg-foreground py-3.5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="flex shrink-0 animate-marquee items-center gap-12 pr-12">
            {[...suggestions, "Elektriker", "Sikkerhed", "Snedker", "Murer", ...suggestions, "Elektriker", "Sikkerhed", "Snedker", "Murer"].map((s, i) => (
              <div key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-medium text-background/40">
                <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
