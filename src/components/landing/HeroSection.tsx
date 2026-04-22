import { Menu, X, ShieldCheck, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-background">
      <nav className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3.5">
            <Link to="/" className="flex items-center" aria-label="Serviceydere forside">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-9 md:h-10" />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/virksomheder" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Find services
              </Link>
              <Link to="/tilbud" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Indhent 3 tilbud
              </Link>
              <Link to="/log-ind?mode=business" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
                Bliv udbyder
              </Link>
            </div>

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
              <Link to="/tilbud" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Indhent 3 tilbud</Link>
              <Link to="/log-ind?mode=business" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Bliv udbyder</Link>
              <div className="my-1 h-px bg-border" />
              <Link to="/log-ind" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Log ind</Link>
              <Link to="/log-ind?signup=1" className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary" onClick={() => setMenuOpen(false)}>Opret konto</Link>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-start">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-sm">
              Serviceydere i hele Danmark
            </p>
            <h1 className="mt-2 max-w-2xl text-[2.2rem] font-semibold leading-[1.02] text-foreground sm:text-[3rem] lg:text-[3.5rem]">
              Find den rette serviceyder til opgaven.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base">
              Søg lokalt med automatisk by og postnummer, sammenlign hurtigt og vælg den rette løsning.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/virksomheder">
                <Button size="lg" className="h-11 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                  Find services
                </Button>
              </Link>
              <Link to="/tilbud">
                <Button size="lg" variant="outline" className="h-11 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                  Indhent 3 tilbud
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-6 rounded-[24px] border border-border bg-background p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <span className="font-semibold text-foreground">Start med en søgning</span>
                <span className="inline-flex items-center gap-1">Nær <LocationChip /></span>
              </div>
              <SearchSuggest variant="hero" />
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-foreground p-4 text-background shadow-sm sm:p-5">
            <img
              src={heroImage}
              alt="Professionel serviceyder klar til at hjælpe"
              className="h-[220px] w-full rounded-[22px] object-cover sm:h-[260px] lg:h-[300px]"
              width={1536}
              height={1024}
              loading="eager"
            />
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Mere ro i valget
              </div>
              <h2 className="mt-3 text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">
                Ét sted til søgning, overblik og tilbud.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-background/75">
                Gå direkte til profiler og send en enkel bestilling, når du har fundet den rigtige virksomhed.
              </p>
              <Link to="/tilbud" className="mt-4 inline-flex items-center justify-center rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90">
                Få tilbud
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
