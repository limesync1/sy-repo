import { ArrowRight, ChevronDown } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import heroImage from "@/assets/hero-window-cleaning.webp";

const HeroSection = () => {
  return (
    <header
      className="relative z-30 isolate text-background"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      {/* Baggrundslag samlet i én overflow-hidden wrapper, så søge-dropdownen
          kan trække ud over hero-kanten uden at blive klippet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Baggrundsbillede — vises nu i fuld styrke. Kontrasten til teksten
            styres udelukkende af den ene scrim-gradient nedenfor, i stedet for
            af flere overlappende lag der gjorde billedet grumset. */}
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          width={1280}
          height={960}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
          loading="eager"
        />
        {/* Én scrim: tæt bag teksten i venstre side, næsten klar i højre side
            så motivet faktisk kan ses. På mobil bruger vi en lodret scrim,
            fordi teksten dér fylder hele bredden. */}
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            backgroundImage:
              "linear-gradient(180deg, hsl(var(--hero-bg) / 0.92) 0%, hsl(var(--hero-bg) / 0.86) 60%, hsl(var(--hero-bg) / 0.72) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            backgroundImage:
              "linear-gradient(96deg, hsl(var(--hero-bg) / 0.96) 0%, hsl(var(--hero-bg) / 0.92) 38%, hsl(var(--hero-bg) / 0.6) 62%, hsl(var(--hero-bg) / 0.25) 100%)",
          }}
        />
        {/* Én enkelt ambient glow i højre side — nok til dybde, ikke nok til
            at sløre motivet. */}
        <div
          className="absolute -top-40 right-[-10%] h-[34rem] w-[34rem] rounded-full blur-[130px] opacity-20"
          style={{ backgroundColor: "hsl(var(--hero-mid))" }}
        />
        {/* Film-grain — analog tekstur */}
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
      </div>


      {/* Indhold — asymmetrisk 60/40 grid */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-8 pt-6 sm:px-6 sm:gap-12 sm:pb-14 sm:pt-10 lg:grid-cols-[60%_40%] lg:gap-20 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/75 backdrop-blur sm:text-[11px] sm:tracking-[0.22em]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }} />
            Hele Danmark
          </span>
          <h1 className="animate-fade-in mt-3 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-background sm:mt-5 sm:text-[2.5rem] sm:leading-[1.06] lg:text-[3.5rem]">
            Find den rette{" "}
            <span className="bg-[linear-gradient(110deg,hsl(var(--hero-cyan))_0%,hsl(var(--hero-cyan-bright))_50%,hsl(var(--hero-cyan))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              serviceyder
            </span>{" "}
            til opgaven.
          </h1>
          <p className="animate-fade-in [animation-delay:120ms] mt-3 max-w-xl text-[14.5px] leading-6 text-background/80 sm:mt-5 sm:text-[17px] sm:leading-[1.6]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>



          <div className="animate-fade-in [animation-delay:220ms] relative z-20 mt-5 w-full max-w-2xl sm:mt-7">
            <SearchSuggest variant="hero" showNearLabel={false} placeholder="Søg efter service, virksomhed eller by…" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-background/80">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:320ms] mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">

            <SmartLink to="/virksomheder" className="sm:w-auto">
              <Button size="lg" className="group h-11 w-full gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-background/90 active:scale-[0.98] sm:w-auto">
                Find services
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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



          {/* Diskret indikator: viser at der er mere indhold under heroen på mobil. */}
          <div aria-hidden className="pointer-events-none mt-6 flex justify-center sm:hidden">
            <ChevronDown className="h-5 w-5 animate-bounce text-background/45" />
          </div>
        </div>

        {/* Højre 40% — bevidst tom, så de ambient glows får luft og giver premium-feel. */}
        <div aria-hidden className="hidden lg:block" />
      </div>

    </header>
  );
};

export default HeroSection;
