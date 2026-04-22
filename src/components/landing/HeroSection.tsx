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

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 md:pb-16">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col justify-between rounded-[40px] bg-secondary px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                Hurtigere fra behov til booking
              </span>
              <h1 className="mt-5 max-w-3xl text-[2.6rem] font-extrabold leading-[0.94] tracking-tight text-foreground sm:text-[3.35rem] md:text-[4.25rem] lg:text-[4.9rem]">
                Find den rette hjælp uden at lede for længe.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Et skarpere overblik over lokale serviceydere med pris, kvalitet og nærhed samlet ét sted.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            </div>

            <div className="mt-8 rounded-[32px] border border-border bg-background p-4 shadow-sm sm:p-5">
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
          </div>

          <div className="relative min-h-[540px] overflow-hidden rounded-[40px] bg-card lg:min-h-[680px]">
            <img
              src={heroImage}
              alt="Professionel serviceyder klar til at hjælpe"
              className="absolute inset-0 h-full w-full object-cover"
              width={1536}
              height={1024}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-background/10" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6 lg:p-7">
              <div className="ml-auto w-full max-w-[220px] rounded-[28px] border border-background/50 bg-background/90 p-4 shadow-xl backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Overblik</div>
                <div className="mt-2 text-lg font-semibold text-foreground">Pris, profil og afstand</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">De vigtigste signaler er synlige før du klikker videre.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
                <div className="rounded-[28px] border border-background/45 bg-background/86 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pris</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Se niveau med det samme</div>
                </div>
                <div className="rounded-[28px] border border-background/45 bg-background/86 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kvalitet</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Fang de stærke profiler hurtigere</div>
                </div>
                <div className="rounded-[28px] border border-background/45 bg-background/86 px-4 py-4 backdrop-blur-sm lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nærhed</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">Lokale valg kommer tydeligere frem</div>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-accent" />
                  </div>
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
