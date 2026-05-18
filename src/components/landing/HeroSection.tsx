import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  return (
    <header className="relative z-30 isolate bg-foreground text-background">
      {/* Baggrundsbillede med blid Ken Burns-zoom — giver liv uden støj. */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImage}
          alt="Professionel vinduespudser i gang med arbejdet"
          className="absolute inset-0 h-full w-full scale-110 object-cover animate-ken-burns will-change-transform"
          width={1280}
          height={960}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Læsbarhedslag — venstre→højre gradient holder tekst-kolonnen mørk
            mens højre side bevarer billedets dybde. */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />

        {/* Én enkelt, blød accent-glow der pulserer langsomt i baggrunden.
            Pointer-events fra så input forbliver fuldt klikbart. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-accent/20 blur-3xl mix-blend-screen animate-blob-slow" />
          <div className="absolute -top-32 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-accent/10 blur-3xl mix-blend-screen" />
        </div>

        {/* Diskret film-grain — bryder gradienterne så de føles
            analoge i stedet for "udvasket digitalt". Lav opacity. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise opacity-[0.07] mix-blend-overlay" />
      </div>

      {/* Indhold */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <h1 className="animate-fade-in text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.03em] text-background sm:text-[3.5rem] lg:text-[4.25rem]">
            Find den rette{" "}
            <span className="bg-[linear-gradient(110deg,hsl(187_100%_49%)_0%,hsl(187_100%_75%)_50%,hsl(187_100%_49%)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              serviceyder
            </span>{" "}
            til opgaven.
          </h1>
          <p className="animate-fade-in [animation-delay:120ms] mt-5 max-w-xl text-[15px] leading-7 text-background/85 sm:text-[17px] sm:leading-[1.6]">
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
      </div>
    </header>
  );
};

export default HeroSection;
