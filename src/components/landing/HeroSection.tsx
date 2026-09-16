import { ArrowRight, BadgeCheck, Star, Zap } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";
import heroImage from "@/assets/hero-window-cleaning.webp";

/**
 * Forsidens hero — redaktionelt split-layout.
 *
 * Venstre side bærer budskab + søgning på en rolig, mørk havflade. Højre side
 * viser motivet i et afrundet "vindue" med to flydende beviskort, så heroen
 * får dybde uden at teksten ligger oven på et grumset foto.
 */
const HeroSection = () => {
  return (
    <header
      className="relative z-30 isolate text-background"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      {/* Baggrundslag i egen overflow-wrapper, så søge-dropdownen kan trække
          ud over hero-kanten uden at blive klippet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 12% 0%, hsl(var(--hero-mid) / 0.45) 0%, transparent 55%), radial-gradient(90% 80% at 100% 100%, hsl(var(--hero-cyan) / 0.18) 0%, transparent 60%)",
          }}
        />
        {/* Fint rudenet — refererer diskret til vinduespudsning/håndværk. */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--hero-cyan) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--hero-cyan) / 0.6) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(80% 70% at 50% 30%, #000 0%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(80% 70% at 50% 30%, #000 0%, transparent 85%)",
          }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-12 pt-8 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="max-w-2xl">
          <span className="animate-fade-in inline-flex items-center gap-2.5 text-[10.5px] font-medium uppercase tracking-[0.24em] text-background/60 sm:text-[11px]">
            <span className="h-px w-6 bg-[hsl(var(--hero-cyan))]" />
            Danmarks serviceplatform
          </span>

          <h1 className="animate-fade-in mt-4 max-w-[21rem] text-[2.15rem] font-semibold leading-[1.04] tracking-[-0.035em] text-background sm:max-w-none sm:text-[3rem] lg:text-[4rem]">
            Find den rette{" "}
            <span className="bg-[linear-gradient(110deg,hsl(var(--hero-cyan))_0%,hsl(var(--hero-cyan-bright))_50%,hsl(var(--hero-cyan))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              serviceyder
            </span>
            <br className="hidden sm:block" /> til opgaven.
          </h1>

          <p className="animate-fade-in [animation-delay:120ms] mt-4 max-w-lg text-[15px] leading-[1.65] text-background/75 sm:mt-6 sm:text-[17px]">
            Sammenlign lokale udbydere, se priser og book direkte — alt samlet ét sted.
          </p>

          {/* Søgefelt i et løftet panel, så det læses som sidens primære handling. */}
          <div className="animate-fade-in [animation-delay:200ms] relative z-20 mt-6 w-full max-w-xl rounded-[20px] border border-background/20 bg-background/[0.09] p-2.5 backdrop-blur-sm sm:mt-8 sm:rounded-[22px] sm:p-3">
            <SearchSuggest
              variant="hero"
              showNearLabel={false}
              placeholder="Søg efter service, virksomhed eller by…"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1 text-xs text-background/70">
              <LocationChip />
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:300ms] mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
            <SmartLink to="/tilbud" className="sm:w-auto">

              <Button
                size="lg"
                className="group h-12 w-full gap-2 rounded-full bg-background px-5 text-sm sm:px-7 font-semibold text-foreground shadow-lg transition-all duration-200 hover:bg-background/90 active:scale-[0.98] sm:w-auto"
              >
                Indhent 3 tilbud
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </SmartLink>
            <SmartLink to="/virksomheder" className="sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="group h-12 w-full gap-2 rounded-full border-background/30 bg-transparent px-5 text-sm sm:px-7 font-semibold text-background transition-all duration-200 hover:bg-background/10 hover:text-background active:scale-[0.98] sm:w-auto"
              >
                Find services
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </SmartLink>
          </div>
        </div>

        {/* Højre side — motiv i afrundet vindue med flydende beviskort. */}
        <div aria-hidden className="relative hidden lg:block">
          <div className="relative overflow-hidden rounded-[32px] border border-background/15 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.75)]">
            <img
              src={heroImage}
              alt=""
              width={1280}
              height={960}
              fetchPriority="high"
              decoding="async"
              loading="eager"
              className="h-[30rem] w-full object-cover object-[65%_center]"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, hsl(var(--hero-bg) / 0.15) 0%, hsl(var(--hero-bg) / 0.55) 100%)",
              }}
            />
          </div>

          <div className="absolute -left-8 top-10 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-foreground shadow-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-tight">CVR-verificeret</div>
              <div className="text-[11px] text-muted-foreground">Alle virksomheder tjekkes</div>
            </div>
          </div>

          <div className="absolute -bottom-6 -right-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-foreground shadow-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
                Svar samme dag
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              </div>
              <div className="text-[11px] text-muted-foreground">Op til 3 tilbud, gratis</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
