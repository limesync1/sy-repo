import { ArrowRight } from "lucide-react";
import supportIcon from "@/assets/content-icons/et-menneske-naar-du-har-brug-for-det.svg.asset.json";
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

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-5 px-4 pb-6 pt-4 sm:gap-6 sm:px-6 sm:pb-10 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-7 lg:pt-5 xl:grid-cols-[1.05fr_0.95fr] xl:gap-10 lg:px-8 xl:pb-8 xl:pt-6 2xl:gap-16 2xl:pb-20 2xl:pt-16">
        <div className="min-w-0 w-full max-w-2xl">
          <SmartLink
            to="/kontakt"
            className="home-support-badge group animate-fade-in mb-3 flex min-h-11 w-full max-w-xl sm:inline-flex sm:w-auto items-center gap-3 rounded-xl p-2 pr-3 text-left text-ocean-foreground backdrop-blur-sm sm:mb-6 lg:mb-3"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean-foreground p-1">
              <img src={supportIcon.url} alt="" width={36} height={36} className="h-full w-full object-contain" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug">Personlig hjælp til panel og ruteplanlægger</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs leading-snug text-ocean-foreground/80 sm:text-[13px]"><span className="home-live-dot h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden="true" />Live kundeservice 24/7 · 100% gratis</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </SmartLink>
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] text-ocean-foreground sm:text-[2.25rem] xl:text-[3rem] 2xl:text-[4rem]">
            Find den rette{" "}
            <span className="home-hero-highlight">
              serviceyder
            </span>
            <br className="hidden xl:block" /> til opgaven.
          </h1>

          <p className="animate-fade-in [animation-delay:120ms] mt-3 max-w-lg text-sm leading-[1.6] text-ocean-foreground/75 sm:mt-5 sm:text-base lg:mt-3 2xl:mt-6 2xl:text-[17px]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt i et løftet panel, så det læses som sidens primære handling. */}
          <div className="animate-fade-in [animation-delay:200ms] home-search-panel relative z-20 mt-4 w-full max-w-xl rounded-lg border border-ocean-foreground/25 p-2 sm:mt-6 sm:p-3 lg:mt-4 2xl:mt-8">
            <SearchSuggest
              variant="hero"
              showNearLabel={false}
              placeholder="Søg efter service, virksomhed eller by…"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-ocean-foreground/70">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:300ms] mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3 lg:mt-4">
              <Button
                asChild
                variant="heroLight"
                size="lg"
                className="home-hero-cta group h-11 sm:h-12 w-full gap-2 rounded-lg px-3 text-sm sm:px-7 font-semibold sm:w-auto"
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
        <div className="relative min-w-0 w-full max-w-2xl lg:max-w-none xl:mx-auto xl:max-w-[31rem] 2xl:max-w-none">
          <HeroPhotoRotator />

        </div>
      </div>
    </header>
  );
};

export default HeroSection;
