import { Menu, X, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home.jpg";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative bg-background">
      {/* Top nav */}
      <nav className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3.5">
            <Link to="/" className="flex items-center" aria-label="Serviceydere forside">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-9 md:h-10" />
            </Link>

            {/* Center nav links */}
            <div className="hidden md:flex items-center gap-1">
              <Link to="/search" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Find services
              </Link>
              <Link to="/quote" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Få tilbud
              </Link>
              <Link to="/auth?role=business" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Bliv udbyder
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Link to="/auth" className="hidden sm:inline-block">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                  Log ind
                </button>
              </Link>
              <Link to="/auth?signup=1" className="hidden sm:inline-block">
                <button className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
                  Opret konto
                </button>
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="mb-3 rounded-2xl border border-border bg-card p-2 shadow-lg md:hidden">
              <Link to="/search" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Find services</Link>
              <Link to="/quote" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Få tilbud</Link>
              <Link to="/auth?role=business" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Bliv udbyder</Link>
              <div className="my-1 h-px bg-border" />
              <Link to="/auth" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Log ind</Link>
              <Link to="/auth?signup=1" className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Opret konto</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero — split layout: text left, image right */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-16 md:pb-20">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-14">
          {/* Left: copy + search */}
          <div className="min-w-0 flex flex-col">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3 w-3" />
              Danmarks samlede platform for serviceydere
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-[3.5rem]">
              Find den rette <span className="text-accent">serviceyder</span> til opgaven.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Sammenlign verificerede virksomheder, læs ægte anmeldelser og book direkte — eller få op til 3 skræddersyede tilbud på få sekunder.
            </p>

            <div className="mt-8">
              <SearchSuggest variant="hero" />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Søger nær:</span>
                <LocationChip />
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Verificerede udbydere
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                AI-matchede tilbud
              </span>
              <span>Gratis & uforpligtende</span>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="relative">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-3xl bg-secondary shadow-xl md:aspect-[4/3] lg:aspect-[5/4] lg:max-h-[480px]">
              <img
                src={heroImage}
                alt="Tilfreds dansk serviceyder klar til opgaven"
                className="h-full w-full object-cover"
                width={1920}
                height={1280}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
