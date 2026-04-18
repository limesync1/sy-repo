import { Search, Menu, X, ArrowUpRight, Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const rotatingWords = ["rengøring", "håndværker", "flyttehjælp", "haveservice", "maler"];

const heroCategories = [
  { icon: Sparkles, label: "Rengøring", count: "240+ virksomheder" },
  { icon: Wrench, label: "Håndværker", count: "180+ virksomheder" },
  { icon: Truck, label: "Flytning", count: "95+ virksomheder" },
  { icon: TreePine, label: "Have", count: "120+ virksomheder" },
  { icon: Paintbrush, label: "Maler", count: "85+ virksomheder" },
  { icon: Droplets, label: "VVS", count: "110+ virksomheder" },
];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % rotatingWords.length), 2200);
    return () => clearInterval(id);
  }, []);

  const handleSearch = () => {
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate("/search");
  };

  return (
    <section className="relative overflow-hidden bg-foreground">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-accent/5 blur-3xl animate-blob" style={{ animationDelay: "-7s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.08),transparent_50%)]" />
      </div>

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(0_0%_100%)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="container relative mx-auto px-4 pt-6 pb-16 md:pt-8 md:pb-24">
        <nav className="mb-12 flex items-center justify-between md:mb-20">
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

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT: Big editorial headline */}
          <div className="animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1.5 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="text-xs font-medium text-background/70">Live · 1.200+ virksomheder klar i dag</span>
            </div>

            <h1 className="mb-6 text-5xl font-extrabold leading-[0.95] tracking-tight text-background md:text-6xl lg:text-7xl">
              Find den rette
              <br />
              <span className="relative inline-block">
                <span
                  key={wordIndex}
                  className="inline-block bg-gradient-to-r from-accent via-accent to-background/80 bg-clip-text text-transparent animate-fade-in"
                >
                  {rotatingWords[wordIndex]}
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 5 Q 50 1, 100 4 T 198 3" stroke="hsl(var(--accent))" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-background/90">– i dag.</span>
            </h1>

            <p className="mb-8 max-w-lg text-lg text-background/60">
              Sammenlign priser, læs ægte anmeldelser og book Danmarks bedste serviceydere på minutter.
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

          {/* RIGHT: Interactive category bento */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              {heroCategories.map((cat, i) => (
                <Link
                  key={cat.label}
                  to={`/search?category=${encodeURIComponent(cat.label)}`}
                  className="group relative overflow-hidden rounded-2xl border border-background/10 bg-background/5 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-background/10"
                  style={{ animation: `fade-in 0.6s ease-out ${i * 80}ms both` }}
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/0 blur-2xl transition-all duration-500 group-hover:bg-accent/30" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/10 text-background transition-all group-hover:bg-accent group-hover:text-accent-foreground">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-background/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <div className="relative mt-6">
                    <div className="text-base font-semibold text-background">{cat.label}</div>
                    <div className="mt-0.5 text-xs text-background/50">{cat.count}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Floating review card */}
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-background/10 bg-background p-4 shadow-2xl xl:block animate-fade-in" style={{ animationDelay: "600ms" }}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-accent to-foreground" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <svg key={i} className="h-3 w-3 fill-accent text-accent" viewBox="0 0 20 20"><path d="M10 1l2.5 6h6l-5 4 2 6.5L10 14l-5.5 3.5 2-6.5-5-4h6z" /></svg>
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-foreground">4.9/5 fra 8.400+ kunder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom marquee ticker */}
      <div className="relative border-t border-background/10 bg-foreground py-4">
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
