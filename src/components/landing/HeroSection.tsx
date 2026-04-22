import { Menu, X, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
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
              <Link to="/virksomheder" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Find services
              </Link>
              <Link to="/tilbud" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Få tilbud
              </Link>
              <Link to="/log-ind?mode=business" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Bliv udbyder
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Link to="/log-ind" className="hidden sm:inline-block">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                  Log ind
                </button>
              </Link>
              <Link to="/log-ind?signup=1" className="hidden sm:inline-block">
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
              <Link to="/virksomheder" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Find services</Link>
              <Link to="/tilbud" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Få tilbud</Link>
              <Link to="/log-ind?mode=business" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Bliv udbyder</Link>
              <div className="my-1 h-px bg-border" />
              <Link to="/log-ind" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Log ind</Link>
              <Link to="/log-ind?signup=1" className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Opret konto</Link>
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 md:pt-10 md:pb-16">
        <div className="relative overflow-hidden rounded-[32px] min-h-[760px] md:min-h-[700px] lg:min-h-[780px]">
          <img
            src={heroImage}
            alt="Professionel serviceyder klar til at hjælpe"
            className="absolute inset-0 h-full w-full object-cover"
            width={1536}
            height={1024}
            loading="eager"
          />
          <div className="absolute inset-0 bg-background/28" />
          <div className="absolute inset-0 bg-foreground/16" />

          <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 md:min-h-[700px] lg:min-h-[780px] lg:px-10 lg:py-10">
            <div className="max-w-3xl pt-6 sm:pt-10 lg:pt-16">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-background/35 bg-background/88 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-accent" />
                Find lokal hjælp uden at rode dig væk
              </span>
              <h1 className="mt-5 max-w-3xl text-[2.4rem] font-extrabold leading-[0.95] tracking-tight text-background sm:text-[3.3rem] md:text-[4.3rem] lg:text-[5.1rem]">
                Den hurtigste vej til den rigtige serviceyder.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-background/88 sm:text-lg md:text-xl">
                Søg, sammenlign og vælg med et klart overblik over pris, kvalitet og nærhed.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/virksomheder">
                  <Button size="lg" className="h-12 w-full rounded-full bg-background px-6 text-sm font-semibold text-foreground hover:bg-background/90 sm:w-auto">
                    Find services
                  </Button>
                </Link>
                <Link to="/tilbud">
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-full border-background/45 bg-background/12 px-6 text-sm font-semibold text-background hover:bg-background/20 hover:text-background sm:w-auto">
                    Få 3 tilbud
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-end">
              <div className="rounded-[28px] border border-background/25 bg-background/92 p-4 shadow-2xl backdrop-blur-md sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Start din søgning</span>
                  <span>Live forslag</span>
                </div>
                <div className="pt-4">
                  <SearchSuggest variant="hero" />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Søger nær:</span>
                    <LocationChip />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[24px] border border-background/25 bg-background/82 px-4 py-4 backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Se niveau før du klikker videre</div>
                </div>
                <div className="rounded-[24px] border border-background/25 bg-background/82 px-4 py-4 backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kvalitet</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Vurdér profiler og anmeldelser hurtigere</div>
                </div>
                <div className="rounded-[24px] border border-background/25 bg-background/82 px-4 py-4 backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nærhed</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Lokale valg kommer tydeligere frem</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
