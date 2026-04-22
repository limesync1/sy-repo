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

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 md:pt-10 md:pb-16">
        <div className="overflow-hidden rounded-[32px] border border-border bg-secondary/60 p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-8">
            <div className="min-w-0 rounded-[28px] bg-card p-5 shadow-sm sm:p-7">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                Lokal service, hurtigere valgt
              </span>
              <h1 className="mt-5 max-w-2xl text-[2.2rem] font-extrabold leading-[1] tracking-tight text-foreground sm:text-[2.8rem] md:text-[3.4rem] lg:text-[3.8rem]">
                Find en serviceyder, der faktisk passer til opgaven.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
                Mindre rod, bedre overblik og hurtigere vej fra søgning til booking.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/virksomheder">
                  <Button size="lg" className="h-12 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                    Find services
                  </Button>
                </Link>
                <Link to="/tilbud">
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-full bg-background px-6 text-sm font-semibold sm:w-auto">
                    Få 3 tilbud
                  </Button>
                </Link>
              </div>

              <div className="mt-7 rounded-[28px] border border-border bg-background shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Match din opgave</span>
                  <span>Live forslag</span>
                </div>
                <div className="p-3 sm:p-4">
                  <SearchSuggest variant="hero" />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Søger nær:</span>
                    <LocationChip />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-secondary/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Se niveau med det samme</div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profil</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Vurdér kvalitet hurtigere</div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/70 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nærhed</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Lokale valg først</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-3 shadow-sm">
                <div className="relative aspect-[4/4.4] overflow-hidden rounded-[24px] bg-secondary">
                  <img
                    src={heroImage}
                    alt="Professionel serviceyder klar til at hjælpe"
                    className="h-full w-full object-cover"
                    width={1536}
                    height={1024}
                    loading="eager"
                  />
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Klar til sammenligning</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">De vigtigste signaler ligger forrest</div>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Overblik</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">Rolig visning</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Færre forstyrrelser og bedre fokus på valget.</p>
                </div>
                <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tempo</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">Hurtigere handling</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Gå fra søgning til kontakt uden unødige trin.</p>
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
