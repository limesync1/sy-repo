import { Search, Menu, X, Sparkles, Wrench, Truck, TreePine, Paintbrush, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

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
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate("/search");
  };

  return (
    <section className="relative bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between py-5">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-10" />
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link to="/search" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Find services</Link>
              <Link to="/quote" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Få tilbud</Link>
              <Link to="/search?category=Rengøring" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Kategorier</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-block">
              <Button size="sm" variant="ghost" className="font-semibold">Log ind</Button>
            </Link>
            <Link to="/auth" className="hidden sm:inline-block">
              <Button size="sm" className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">Bliv vært</Button>
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm md:hidden">
            <div className="flex flex-col gap-1">
              <Link to="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Find services</Link>
              <Link to="/quote" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Få tilbud</Link>
              <Link to="/search?category=Rengøring" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Kategorier</Link>
              <Link to="/auth" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Log ind</Link>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-background to-accent/10 px-6 py-16 md:px-14 md:py-24">
          {/* Soft decorative blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Danmarks nye serviceplatform
            </span>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Find den rette service
              <br />
              <span className="text-accent">til dit hjem.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground md:text-lg">
              Sammenlign priser, læs ægte anmeldelser og book Danmarks bedste serviceydere på få minutter.
            </p>

            {/* Pill search */}
            <div className="mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-foreground/5 sm:flex-row sm:rounded-full">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Hvad har du brug for?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                size="lg"
                onClick={handleSearch}
                className="h-12 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground hover:bg-accent/90 sm:rounded-full"
              >
                Søg
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Link
                  key={s}
                  to={`/search?category=${encodeURIComponent(s)}`}
                  className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-accent/40 hover:text-foreground"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick category chips below hero */}
        <div className="mt-8 grid grid-cols-3 gap-3 md:grid-cols-6">
          {heroCategories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?category=${encodeURIComponent(cat.label)}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                <cat.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
