import { Search, Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-home.jpg";

const HeroSection = () => {
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (what.trim()) params.set("q", what.trim());
    if (where.trim()) params.set("city", where.trim());
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <header className="relative">
      {/* Top nav — sits above hero, transparent */}
      <nav className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <Link to="/" className="flex items-center">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-10 brightness-0 invert" />
            </Link>
            <div className="hidden items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-1 backdrop-blur-md md:flex">
              <Link to="/search" className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20">Find services</Link>
              <Link to="/quote" className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20">Få tilbud</Link>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 md:inline-flex" aria-label="Sprog">
                <Globe className="h-4 w-4" />
              </button>
              <Link to="/auth" className="hidden sm:inline-block">
                <button className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-white/20">
                  <Menu className="h-4 w-4 text-white" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-foreground">
                    <span className="text-xs font-semibold">U</span>
                  </div>
                </button>
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 md:hidden"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="rounded-2xl border border-border bg-card p-3 shadow-lg md:hidden">
              <Link to="/search" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Find services</Link>
              <Link to="/quote" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Få tilbud</Link>
              <Link to="/auth" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Log ind</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero with full bleed image */}
      <div className="relative h-[640px] w-full overflow-hidden md:h-[720px]">
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1280}
        />
        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/20 to-foreground/40" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl pt-16">
            <h1 className="mb-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-sm md:text-6xl lg:text-7xl">
              Find serviceydere du kan stole på
            </h1>
            <p className="mb-10 max-w-xl text-base text-white/90 md:text-lg">
              Sammenlign priser, læs ægte anmeldelser og book Danmarks bedste serviceydere på få minutter.
            </p>
          </div>

          {/* Multi-field search bar — Airbnb style */}
          <div className="w-full max-w-3xl">
            <div className="flex flex-col items-stretch overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:h-16 md:flex-row md:items-center md:rounded-full">
              <div className="flex flex-1 flex-col px-6 py-3 md:py-0">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground">Hvad</label>
                <input
                  type="text"
                  placeholder="Fx rengøring, maler, VVS"
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="h-px w-full bg-border md:h-8 md:w-px" />
              <div className="flex flex-1 flex-col px-6 py-3 md:py-0">
                <label className="text-[11px] font-bold uppercase tracking-wide text-foreground">Hvor</label>
                <input
                  type="text"
                  placeholder="By eller postnummer"
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="px-3 py-3 md:py-0">
                <Button
                  onClick={handleSearch}
                  className="h-12 w-full gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-accent/90 md:w-auto md:px-8"
                >
                  <Search className="h-4 w-4" />
                  Søg
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
