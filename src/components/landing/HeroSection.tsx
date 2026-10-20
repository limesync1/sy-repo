import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import heroImage from "@/assets/hero-window-cleaning.webp";
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

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-10 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:pb-14 lg:pt-12 2xl:gap-16 2xl:pb-20 2xl:pt-16">
        <div className="max-w-2xl">
          <h1 className="animate-fade-in max-w-[21rem] text-[2.15rem] font-semibold leading-[1.1] text-ocean-foreground sm:max-w-none sm:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.5rem] 2xl:text-[4rem]">
            Find den rette{" "}
            <span className="home-hero-highlight">
              serviceyder
            </span>
            <br className="hidden sm:block" /> til opgaven.
          </h1>

          <p className="animate-fade-in [animation-delay:120ms] mt-4 max-w-lg text-[15px] leading-[1.65] text-ocean-foreground/75 sm:mt-5 sm:text-base 2xl:mt-6 2xl:text-[17px]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt i et løftet panel, så det læses som sidens primære handling. */}
          <div className="animate-fade-in [animation-delay:200ms] home-search-panel relative z-20 mt-6 w-full max-w-xl rounded-lg border border-ocean-foreground/25 p-2.5 sm:mt-7 sm:p-3 2xl:mt-8">
            <SearchSuggest
              variant="hero"
              showNearLabel={false}
              placeholder="Søg efter service, virksomhed eller by…"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1 text-xs text-ocean-foreground/70">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:300ms] mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Button
                asChild
                variant="heroLight"
                size="lg"
                className="group h-12 w-full gap-2 rounded-lg px-5 text-sm sm:px-7 font-semibold sm:w-auto"
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
                className="group h-12 w-full gap-2 rounded-lg px-5 text-sm sm:px-7 font-semibold sm:w-auto"
              >
                <SmartLink to="/virksomheder">
                  Find services
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SmartLink>
              </Button>
          </div>
        </div>

        {/* Højre side — motiv i et roligt, afrundet vindue. */}
        <div aria-hidden className="relative hidden lg:block">
          <div className="home-hero-photo relative overflow-hidden rounded-lg border border-ocean-foreground/25">
            <img
              src={heroImage}
              alt=""
              width={1280}
              height={960}
              fetchPriority="high"
              decoding="async"
              loading="eager"
              className="h-[24rem] w-full object-cover object-[65%_center] xl:h-[26rem] 2xl:h-[30rem]"
            />
            <div
              className="home-photo-shade absolute inset-0"
            />
          </div>

        </div>
      </div>
    </header>
  );
};

export default HeroSection;
