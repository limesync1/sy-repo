import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import HeroPhotoRotator from "./HeroPhotoRotator";
import BlueFlowBackground from "./BlueFlowBackground";

/**
 * Forsidens hero — redaktionelt split-layout.
 *
 * Venstre side bærer budskab + søgning på en rolig, mørk havflade. Højre side
 * viser motivet i et afrundet "vindue", så heroen
 * får dybde uden at teksten ligger oven på et grumset foto.
 */
const HeroSection = () => {
  return (
    <header
      className="home-hero relative z-30 isolate bg-ocean text-ocean-foreground"
    >
      <BlueFlowBackground />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-5 px-4 pb-6 pt-4 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:gap-10 lg:px-8 xl:pb-14 xl:pt-12 2xl:gap-16 2xl:pb-20 2xl:pt-16">
        <div className="min-w-0 w-full max-w-2xl">
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] text-ocean-foreground sm:text-[2.25rem] xl:text-[3.5rem] 2xl:text-[4rem]">
            Find den rette{" "}
            <span className="home-hero-highlight">
              serviceyder
            </span>
            <br className="hidden xl:block" /> til opgaven.
          </h1>

          <p className="animate-fade-in [animation-delay:120ms] mt-3 max-w-lg text-sm leading-[1.6] text-ocean-foreground/75 sm:mt-5 sm:text-base 2xl:mt-6 2xl:text-[17px]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt i et løftet panel, så det læses som sidens primære handling. */}
          <div className="animate-fade-in [animation-delay:200ms] home-search-panel relative z-20 mt-5 w-full max-w-xl rounded-lg border border-ocean-foreground/25 p-2 sm:mt-7 sm:p-3 2xl:mt-8">
            <SearchSuggest
              variant="hero"
              showNearLabel={false}
              placeholder="Søg efter service, virksomhed eller by…"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-ocean-foreground/70">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:300ms] mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Button
                asChild
                variant="heroLight"
                size="lg"
                className="group h-11 sm:h-12 w-full gap-2 rounded-lg px-3 text-sm sm:px-7 font-semibold sm:w-auto"
              >
                <SmartLink to="/tilbud">
                  Indhent 3 tilbud
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SmartLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="heroDark"
                className="group h-11 sm:h-12 w-full gap-2 rounded-lg px-3 text-sm sm:px-7 font-semibold sm:w-auto"
              >
                <SmartLink to="/virksomheder">
                  Find services
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SmartLink>
              </Button>
          </div>
          <p className="animate-fade-in [animation-delay:400ms] mt-4 text-sm leading-6 text-ocean-foreground/80">
            Driver du en servicevirksomhed?{" "}
            <SmartLink to="/opret-virksomhed" className="inline-flex min-h-11 items-center font-semibold text-ocean-foreground underline underline-offset-4 hover:no-underline">
              Opret din virksomhed gratis
            </SmartLink>
          </p>
        </div>

        {/* Højre side — motiv i et roligt, afrundet vindue. */}
        <div className="relative min-w-0 w-full max-w-2xl lg:max-w-none">
          <HeroPhotoRotator />

        </div>
      </div>
    </header>
  );
};

export default HeroSection;
