import { ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-home-new.jpg";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import SiteNav from "@/components/SiteNav";

const HeroSection = () => {
  return (
    <header className="bg-background">
      <SiteNav />

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
