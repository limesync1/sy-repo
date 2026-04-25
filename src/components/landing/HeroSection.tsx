import { ArrowRight, ShieldCheck, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import SiteNav from "@/components/SiteNav";

const HeroSection = () => {
  return (
    <header className="relative isolate bg-foreground text-background">
      {/* Baggrundsbillede — clipped i sit eget lag, så søgeforslag kan flyde ud over hero-kanten */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImage}
          alt="Professionel vinduespudser i gang med arbejdet"
          className="absolute inset-0 h-full w-full object-cover"
          width={1280}
          height={960}
          loading="eager"
        />
        {/* Overlay for læsbarhed — let-til-tung gradient fra venstre, så teksten står skarpt */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/92 via-foreground/72 to-foreground/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent" />
      </div>

      <SiteNav />

      {/* Indhold — venstrejusteret, matcher resten af forsidens sektioner */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/85 backdrop-blur sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Serviceydere i hele Danmark
          </span>
          <h1 className="mt-5 text-[2.4rem] font-semibold leading-[1.04] tracking-tight text-background sm:text-[3.25rem] lg:text-[3.75rem]">
            Find den rette serviceyder til opgaven.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-background/85 sm:text-base">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt + lokation samlet ét sted. Bruger relativ positionering så dropdown kan flyde frit. */}
          <div className="relative z-20 mt-7 w-full max-w-2xl">
            <SearchSuggest variant="hero" showNearLabel={false} placeholder="Søg efter service, virksomhed eller by…" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-background/80">
              <span className="font-medium text-background/65">Søger nær</span>
              <LocationChip />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/virksomheder" className="sm:w-auto">
              <Button size="lg" className="h-11 w-full rounded-full bg-background px-6 text-sm font-semibold text-foreground shadow-md hover:bg-background/90 sm:w-auto">
                Find services
              </Button>
            </Link>
            <Link to="/tilbud" className="sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full gap-2 rounded-full border-background/40 bg-background/5 px-6 text-sm font-semibold text-background backdrop-blur hover:bg-background/15 hover:text-background sm:w-auto"
              >
                Indhent 3 tilbud
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Trust strip — diskret signal under CTA'er */}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-background/75">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Verificerede udbydere
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-accent" />
              Ægte anmeldelser
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              Hele Danmark
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
