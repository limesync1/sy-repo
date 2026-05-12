import { ArrowRight, Star, ShieldCheck, Users } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

const HeroSection = () => {
  return (
    <header className="relative z-30 isolate overflow-hidden bg-foreground text-background">
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
        </div>
      </div>

      {/* Indhold */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          {/* Live-badge — diskret pulserende prik signalerer aktivitet på platformen. */}
          <div className="animate-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-xs font-medium text-background backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Tusindvis af serviceydere klar nu
          </div>

          <h1 className="animate-fade-in text-[2rem] font-semibold leading-[1.06] tracking-tight text-background sm:text-[3.25rem] lg:text-[3.75rem]">
            Find den rette{" "}
            <span className="bg-[linear-gradient(110deg,hsl(var(--background))_0%,hsl(var(--accent))_50%,hsl(var(--background))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              serviceyder
            </span>{" "}
            til opgaven.
          </h1>
          <p className="animate-fade-in [animation-delay:120ms] mt-4 max-w-xl text-[15px] leading-7 text-background/85 sm:text-base">
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

          {/* Lille trust-række — stjerner, verificerede og brugere. Animeres
              ind sidst i sequencen så den lander roligt under CTA'erne. */}
          <div className="animate-fade-in [animation-delay:420ms] mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-background/85">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="font-medium">4,9 / 5</span>
              <span className="text-background/60">· 2.400+ anmeldelser</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>CVR-verificerede udbydere</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-accent" />
              <span>Brugt af 35.000+ danskere</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
