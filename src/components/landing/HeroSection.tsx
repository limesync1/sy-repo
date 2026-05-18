import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  return (
    <header
      className="relative z-30 isolate overflow-hidden text-background"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      {/* Ambient cyan glows — giver dybde uden støj. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Stor central cyan-glow, langsomt pulserende */}
        <div
          className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] opacity-25 animate-blob-slow"
          style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
        />
        {/* Mid-blå glow øverst højre */}
        <div
          className="absolute -top-32 right-[-8%] h-[36rem] w-[36rem] rounded-full blur-[110px] opacity-30"
          style={{ backgroundColor: "hsl(var(--hero-mid))" }}
        />
        {/* Lille cyan accent nederst venstre */}
        <div
          className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full blur-[100px] opacity-15"
          style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }}
        />
        {/* Subtil radial gradient overlay for ekstra dybde */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 70% 50%, hsl(var(--hero-mid) / 0.25), transparent 60%)",
          }}
        />
        {/* Film-grain — analog tekstur */}
        <div className="absolute inset-0 bg-noise opacity-[0.06] mix-blend-overlay" />
      </div>

      {/* Indhold — asymmetrisk 60/40 grid */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[60%_40%] lg:gap-20 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <h1 className="animate-fade-in text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.03em] text-background sm:text-[3.5rem] lg:text-[4.5rem]">
            Find den rette{" "}
            <span className="bg-[linear-gradient(110deg,hsl(var(--hero-cyan))_0%,hsl(var(--hero-cyan-bright))_50%,hsl(var(--hero-cyan))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              serviceyder
            </span>{" "}
            til opgaven.
          </h1>
          <p className="animate-fade-in [animation-delay:120ms] mt-6 max-w-xl text-[15px] leading-7 text-background/80 sm:text-[18px] sm:leading-[1.6]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          <div className="animate-fade-in [animation-delay:220ms] relative z-20 mt-7 w-full max-w-2xl">
            <SearchSuggest variant="hero" showNearLabel={false} placeholder="Søg efter service, virksomhed eller by…" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-background/80">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:320ms] mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <SmartLink to="/virksomheder" className="sm:w-auto">
              <Button size="lg" className="group h-11 w-full gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-background/90 hover:shadow-lg active:scale-[0.98] sm:w-auto">
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
        </div>

        {/* Højre 40% — bevidst tom, så de ambient glows får luft og giver premium-feel. */}
        <div aria-hidden className="hidden lg:block" />
      </div>
    </header>
  );
};

export default HeroSection;
