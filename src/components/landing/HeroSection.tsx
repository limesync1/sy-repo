import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock3,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const quickSignals = [
  { label: "Verificerede profiler", icon: ShieldCheck },
  { label: "Lokale resultater", icon: MapPin },
  { label: "Hurtigere valg", icon: Clock3 },
];

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative overflow-hidden bg-background">
      <div className="absolute inset-y-0 right-0 hidden w-[56vw] lg:block">
        <img
          src={heroImage}
          alt="Professionel serviceyder klar til en opgave"
          className="h-full w-full object-cover"
          width={1536}
          height={1024}
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/30 to-background" />
      </div>

      <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
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

      <div className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[calc(100vh-72px)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:py-14">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                En hurtigere vej fra behov til booking
              </div>

              <h1 className="mt-6 max-w-4xl text-[3rem] font-extrabold leading-[0.9] tracking-tight text-foreground sm:text-[4.5rem] lg:text-[6.4rem]">
                Find den rette hjælp uden at fare vild i kataloget.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Serviceydere gør søgning mere brugbar med nærhed, kvalitet og
                pris samlet i ét klart overblik fra første klik.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                    className="h-12 rounded-full bg-background px-6 text-sm font-semibold"
                  >
                    Få 3 tilbud
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                {quickSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="inline-flex items-center gap-2"
                  >
                    <signal.icon className="h-4 w-4 text-accent" />
                    <span>{signal.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:min-h-[680px]">
              <div className="relative h-full min-h-[360px] overflow-hidden rounded-[40px] bg-secondary lg:ml-auto lg:w-[88%]">
                <img
                  src={heroImage}
                  alt="Professionel serviceyder klar til at hjælpe"
                  className="h-full w-full object-cover lg:hidden"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/28 via-transparent to-background/10 lg:hidden" />

                <div className="absolute bottom-0 left-0 right-0 grid gap-px bg-border sm:grid-cols-3">
                  <div className="bg-background/92 px-4 py-4 backdrop-blur-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Signal
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Tydelige profiler
                    </div>
                  </div>
                  <div className="bg-background/92 px-4 py-4 backdrop-blur-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Signal
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Kortere vej til valg
                    </div>
                  </div>
                  <div className="bg-background/92 px-4 py-4 backdrop-blur-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Signal
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Mere lokal relevans
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 -mt-10 pb-8 lg:-mt-24 lg:pb-14">
            <div className="overflow-hidden rounded-[32px] border border-border bg-background shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.22)]">
              <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
                <div className="bg-background px-5 py-5 sm:px-6 sm:py-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Søg direkte
                      </div>
                      <div className="mt-1 text-base font-semibold text-foreground">
                        Start med service, virksomhed eller område
                      </div>
                    </div>
                    <LocationChip />
                  </div>
                  <SearchSuggest variant="hero" />
                </div>

                <div className="grid gap-px bg-border sm:grid-cols-3 lg:grid-cols-1">
                  <div className="bg-secondary px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Første filter
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Star className="h-4 w-4 text-accent" />
                      Kvalitet og tillid
                    </div>
                  </div>
                  <div className="bg-background px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Andet filter
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-accent" />
                      Nærhed og timing
                    </div>
                  </div>
                  <div className="bg-secondary px-5 py-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Sidste filter
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock3 className="h-4 w-4 text-accent" />
                      Prisniveau og fart
                    </div>
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
