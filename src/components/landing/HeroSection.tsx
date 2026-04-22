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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-8 sm:pb-10 md:pt-12 md:pb-14">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-12">
          {/* Left: copy + search */}
          <div className="min-w-0 flex flex-col py-1 md:py-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3 w-3" />
              Danmarks samlede platform for serviceydere
            </span>
            <h1 className="mt-4 max-w-2xl text-[2rem] font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-[2.5rem] md:text-[3.2rem] lg:text-[3.6rem]">
              Find den rette <span className="text-accent">serviceyder</span> til opgaven.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
              Sammenlign verificerede virksomheder, læs ægte anmeldelser og book direkte — eller få op til 3 skræddersyede tilbud på få sekunder.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/virksomheder">
                <Button size="lg" className="h-12 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                  Find services
                </Button>
              </Link>
              <Link to="/tilbud">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                  Få 3 tilbud
                </Button>
              </Link>
            </div>

            <div className="mt-6 rounded-[28px] border border-border bg-card p-3 shadow-sm sm:mt-8 sm:p-4">
              <SearchSuggest variant="hero" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Søger nær:</span>
                <LocationChip />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Rengøring i nærheden",
                  "Håndværker i dag",
                  "Få tilbud hurtigt",
                ].map((shortcut) => (
                  <span
                    key={shortcut}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {shortcut}
                  </span>
                ))}
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:mt-6 sm:grid-cols-3 sm:gap-3">
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

          <div className="relative mt-2 hidden md:block">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[28px] bg-secondary shadow-xl lg:max-h-[520px]">
              <img
                src={heroImage}
                alt="Professionel serviceyder klar til at hjælpe"
                className="h-full w-full object-cover"
                width={1536}
                height={1024}
                loading="eager"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-card/92 p-4 shadow-lg backdrop-blur">
                <div className="text-sm font-semibold text-foreground">Sammenlign smartere</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Få overblik over pris, anmeldelser og tilgængelighed uden at hoppe mellem flere sider.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Prisoverblik",
                    "Verificerede profiler",
                    "Nær din lokation",
                  ].map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
                    >
                      {item}
                    </span>
                  ))}
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
