import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  return (
    <header className="relative z-30 isolate bg-foreground text-background">
      {/* Baggrundsbillede — clipped i sit eget lag, så søgeforslag kan flyde ud over hero-kanten */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImage}
          alt="Professionel vinduespudser i gang med arbejdet"
          className="absolute inset-0 h-full w-full object-cover"
          width={1280}
          height={960}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Overlay for læsbarhed — lettere end før, men stadig nok til at hvid
            tekst er klart læsbar over varierede partier af baggrundsbilledet.
            To lag: en venstre→højre gradient der løfter tekst-kolonnen, og et
            blødt globalt slør der jævner kontrasten ud uden at gøre billedet sort. */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/55 to-foreground/15" />
        <div className="absolute inset-0 bg-foreground/15" />
      </div>

      {/* Indhold — venstrejusteret, matcher resten af forsidens sektioner */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          {/* Blid stagger-entry: titel → tekst → søgefelt → CTA. Korte
              durations + ease-out så det føles snappy, ikke tungt. */}
          <h1 className="animate-fade-in text-[2rem] font-semibold leading-[1.06] tracking-tight text-background sm:text-[3.25rem] lg:text-[3.75rem]">
            Find den rette serviceyder til opgaven.
          </h1>
          <p className="animate-fade-in [animation-delay:120ms] mt-4 max-w-xl text-[15px] leading-7 text-background/85 sm:text-base">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt — dropdown må flyde frit ud over hero-kanten via z-20. */}
          <div className="animate-fade-in [animation-delay:220ms] relative z-20 mt-7 w-full max-w-2xl">
            <SearchSuggest variant="hero" showNearLabel={false} placeholder="Søg efter service, virksomhed eller by…" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-background/80">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:320ms] mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <SmartLink to="/virksomheder" className="sm:w-auto">
              <Button size="lg" className="h-11 w-full rounded-full bg-background px-6 text-sm font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-background/90 hover:shadow-lg active:scale-[0.98] sm:w-auto">
                Find services
              </Button>
            </SmartLink>
            <SmartLink to="/tilbud" className="sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="group h-11 w-full gap-2 rounded-full border-background/40 bg-background/5 px-6 text-sm font-semibold text-background backdrop-blur transition-all duration-200 hover:bg-background/15 hover:text-background active:scale-[0.98] sm:w-auto"
              >
                Indhent 3 tilbud
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </SmartLink>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
