import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import SiteNav from "@/components/SiteNav";

const HeroSection = () => {
  return (
    <header className="relative isolate overflow-hidden bg-foreground text-background">
      {/* Baggrundsbillede */}
      <img
        src={heroImage}
        alt="Professionel vinduespudser i gang med arbejdet"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        width={1280}
        height={960}
        loading="eager"
      />
      {/* Overlay for læsbarhed */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/80 via-foreground/55 to-foreground/85" />

      <SiteNav />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24 lg:pb-36 lg:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/80 sm:text-sm">
          Serviceydere i hele Danmark
        </p>
        <h1 className="mt-4 max-w-3xl text-[2.4rem] font-semibold leading-[1.05] text-background sm:text-[3.25rem] lg:text-[3.75rem]">
          Find den rette serviceyder til opgaven.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-background/85 sm:text-base">
          Søg lokalt med automatisk by og postnummer, sammenlign hurtigt og vælg den rette løsning.
        </p>

        {/* Søgefelt-kort */}
        <div className="mt-8 w-full max-w-2xl rounded-[24px] border border-background/20 bg-background/95 p-3 shadow-2xl backdrop-blur sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground">Start med en søgning</span>
            <span className="inline-flex items-center gap-1">Nær <LocationChip /></span>
          </div>
          <SearchSuggest variant="hero" />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link to="/virksomheder">
            <Button size="lg" className="h-11 w-full rounded-full px-6 text-sm font-semibold sm:w-auto">
              Find services
            </Button>
          </Link>
          <Link to="/tilbud">
            <Button
              size="lg"
              variant="outline"
              className="h-11 w-full rounded-full border-background/40 bg-background/10 px-6 text-sm font-semibold text-background hover:bg-background/20 hover:text-background sm:w-auto"
            >
              Indhent 3 tilbud
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
