import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock3,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const heroSignals = [
  { label: "Kvalitet", value: "Verificerede profiler" },
  { label: "Pris", value: "Hurtigt niveau" },
  { label: "Nærhed", value: "Lokale matches" },
];

const flowSteps = [
  "Beskriv opgaven",
  "Sammenlign profiler",
  "Book den rette løsning",
];

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3.5">
            <Link
              to="/"
              className="flex items-center"
              aria-label="Serviceydere forside"
            >
              <img
                src="/serviceydere-logo-dark.png"
                alt="Serviceydere"
                className="h-9 md:h-10"
              />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/virksomheder"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
              >
                Find services
              </Link>
              <Link
                to="/tilbud"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
              >
                Få tilbud
              </Link>
              <Link
                to="/log-ind?mode=business"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
              >
                Bliv udbyder
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/log-ind" className="hidden sm:inline-flex">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                  Log ind
                </button>
              </Link>
              <Link to="/log-ind?signup=1" className="hidden sm:inline-flex">
                <button className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
                  Opret konto
                </button>
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="mb-3 rounded-[28px] border border-border bg-card p-2 shadow-lg md:hidden">
              <Link
                to="/virksomheder"
                className="block rounded-2xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Find services
              </Link>
              <Link
                to="/tilbud"
                className="block rounded-2xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Få tilbud
              </Link>
              <Link
                to="/log-ind?mode=business"
                className="block rounded-2xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Bliv udbyder
              </Link>
              <div className="my-1 h-px bg-border" />
              <Link
                to="/log-ind"
                className="block rounded-2xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Log ind
              </Link>
              <Link
                to="/log-ind?signup=1"
                className="block rounded-2xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Opret konto
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="relative overflow-hidden border-b border-border bg-secondary/40">
        <img
          src={heroImage}
          alt="Professionel serviceyder på vej til en opgave"
          className="absolute inset-0 h-full w-full object-cover"
          width={1536}
          height={1024}
          loading="eager"
        />
        <div className="absolute inset-0 bg-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/72 to-background/44" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/75 to-transparent" />

        <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col justify-between px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/88 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Find hurtigere frem til den rigtige hjælp
              </span>

              <h1 className="mt-6 max-w-4xl text-[2.8rem] font-extrabold leading-[0.94] tracking-tight text-foreground sm:text-[4rem] lg:text-[5.4rem]">
                Find lokale serviceydere uden at rode dig gennem støj.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/78 sm:text-lg">
                Sammenlign prisniveau, kvalitet og nærhed i én visning, og gå
                fra søgning til booking med langt mindre friktion.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/virksomheder">
                  <Button
                    size="lg"
                    className="h-12 gap-2 rounded-full px-6 text-sm font-semibold"
                  >
                    Find services
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/tilbud">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full bg-background/86 px-6 text-sm font-semibold backdrop-blur-sm"
                  >
                    Få 3 tilbud
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="ml-auto max-w-md overflow-hidden rounded-[32px] border border-border bg-background/86 shadow-xl backdrop-blur-md">
                <div className="grid grid-cols-3 border-b border-border">
                  {heroSignals.map((signal) => (
                    <div key={signal.label} className="px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {signal.label}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-foreground">
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-px bg-border">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-center justify-between bg-background px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          0{index + 1}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {step}
                        </span>
                      </div>
                      {index === 0 ? (
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-accent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-border bg-background/90 shadow-2xl backdrop-blur-md">
            <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
              <div className="bg-background px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Søg direkte
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Start med det, du skal have løst
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <LocationChip />
                  </div>
                </div>
                <SearchSuggest variant="hero" />
              </div>

              <div className="grid gap-px bg-border sm:grid-cols-3 lg:grid-cols-1">
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Signal
                  </div>
                  <div className="mt-2 text-base font-semibold text-foreground">
                    Verificerede profiler
                  </div>
                </div>
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Signal
                  </div>
                  <div className="mt-2 text-base font-semibold text-foreground">
                    Lokale resultater
                  </div>
                </div>
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Signal
                  </div>
                  <div className="mt-2 text-base font-semibold text-foreground">
                    Hurtigere valg
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
