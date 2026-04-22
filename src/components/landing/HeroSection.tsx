import { Menu, X, ShieldCheck, Sparkles, ArrowRight, Search, MapPin, Quote } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const proofPoints = [
  { label: "Verificerede profiler", value: "Kvalitet først", tone: "bg-feature-cool text-feature-cool-foreground" },
  { label: "3 tilbud", value: "når du vil sammenligne", tone: "bg-feature-warm text-feature-warm-foreground" },
  { label: "Lokal søgning", value: "hele Danmark", tone: "bg-feature-lilac text-feature-lilac-foreground" },
];

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative overflow-hidden bg-background">
      <nav className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-md">
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
            <div className="mb-3 rounded-2xl border border-border bg-card p-2 shadow-panel md:hidden">
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

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-stretch lg:gap-8">
          <div className="surface-panel rounded-[30px] border border-border px-5 py-6 shadow-panel sm:px-7 sm:py-8 lg:px-8 lg:py-9">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Professionel hjælp, uden støj
            </div>

            <div className="mt-5 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Serviceydere i hele Danmark</p>
              <h1 className="mt-3 text-[2.4rem] leading-[0.95] text-foreground sm:text-[3.2rem] lg:text-[4.35rem]">
                Find den rette serviceyder til opgaven.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Søg lokalt, sammenlign hurtigt og vælg med større sikkerhed — uanset om du vil booke direkte eller indhente 3 tilbud.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/virksomheder">
                <Button size="lg" className="h-12 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
                  Find services
                </Button>
              </Link>
              <Link to="/tilbud">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-full border-border bg-background px-6 text-sm font-semibold sm:w-auto">
                  Indhent 3 tilbud
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-7 rounded-[26px] border border-border bg-background p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Search className="h-4 w-4 text-accent" />
                  Start med en søgning
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Søger nær <LocationChip />
                </div>
              </div>
              <SearchSuggest variant="hero" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div key={item.label} className={`rounded-2xl px-4 py-4 ${item.tone}`}>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-1 text-xs opacity-80">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="relative overflow-hidden rounded-[30px] border border-border bg-foreground p-4 text-background shadow-panel sm:p-5">
              <img
                src={heroImage}
                alt="Professionel serviceyder klar til at hjælpe"
                className="h-[240px] w-full rounded-[24px] object-cover sm:h-[280px] lg:h-[320px]"
                width={1536}
                height={1024}
                loading="eager"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background/90">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    Mere ro i valget
                  </div>
                  <h2 className="mt-3 text-2xl leading-tight text-background sm:text-[2rem]">
                    Ét sted til søgning, overblik og tilbud.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-background/75">
                    Gå direkte til profiler, eller lad platformen hjælpe dig med at indhente relevante tilbud på tværs af markedet.
                  </p>
                </div>
                <Link to="/tilbud" className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5">
                  <Quote className="h-4 w-4 text-accent" />
                  Få tilbud
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Direkte booking</div>
                <div className="mt-3 text-xl font-semibold text-foreground">Når du vil hurtigt videre</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Brug søgningen til at finde profiler med pris, anmeldelser og lokation samlet på samme side.
                </p>
              </div>
              <div className="rounded-[26px] border border-border bg-accent-soft p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Tilbudsflow</div>
                <div className="mt-3 text-xl font-semibold text-foreground">Når du vil sammenligne 3 tilbud</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Beskriv opgaven én gang og få relevante svar tilbage i stedet for at kontakte flere manuelt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
