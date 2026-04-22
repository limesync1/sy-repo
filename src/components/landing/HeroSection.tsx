import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock3,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";

const quickSignals = [
  { label: "Verificerede profiler", icon: ShieldCheck },
  { label: "Lokale resultater", icon: MapPin },
  { label: "Hurtigere valg", icon: Clock3 },
];

const heroNotes = [
  "Pris, kvalitet og nærhed tættere samlet",
  "Kortere vej fra søgning til booking",
];

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative bg-background">
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

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-14 lg:pt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(420px,1.06fr)] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              En hurtigere vej fra behov til booking
            </div>

            <h1 className="mt-6 max-w-4xl text-[3rem] font-extrabold leading-[0.9] tracking-tight text-foreground sm:text-[4.5rem] lg:text-[5.8rem]">
              Find den rette hjælp uden at fare vild i kataloget.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Serviceydere gør søgning mere brugbar med nærhed, kvalitet og pris
              samlet i ét klart overblik fra første klik.
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

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
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

          <div className="relative">
            <div className="relative overflow-hidden rounded-[38px] bg-secondary shadow-sm">
              <div className="aspect-[5/6] sm:aspect-[16/11] lg:aspect-[5/6]">
                <img
                  src={heroImage}
                  alt="Professionel serviceyder klar til at hjælpe"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/24 via-transparent to-background/12" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6">
                <div className="overflow-hidden rounded-[28px] border border-background/40 bg-background/88 shadow-lg backdrop-blur-sm">
                  <div className="grid gap-px bg-border sm:grid-cols-3">
                    {quickSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className="bg-background px-4 py-4"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Signal
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <signal.icon className="h-4 w-4 text-accent" />
                          {signal.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {heroNotes.map((note, index) => (
                <div
                  key={note}
                  className={`rounded-[24px] px-4 py-4 ${index === 0 ? "bg-secondary" : "bg-secondary/60"}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Overblik
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
