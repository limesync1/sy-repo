import { ArrowRight, Sparkles, Sparkle, Wrench, Hammer, Brush, Truck, Leaf, Zap, Home as HomeIcon, Paintbrush } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import heroImage from "@/assets/hero-window-cleaning.webp";
import { Button } from "@/components/ui/button";
import SearchSuggest from "./SearchSuggest";
import LocationChip from "@/components/LocationChip";

/** Floating service "chips" der svæver blødt rundt i højre side af hero.
 *  Hver pille har sit eget delay/tempo så bevægelsen aldrig synkroniserer
 *  og det føles organisk frem for mekanisk. */
const FLOATING_CHIPS = [
  { icon: Brush,      label: "Rengøring",   x: "8%",  y: "12%", delay: "0s",   anim: "animate-float-y" },
  { icon: Hammer,     label: "Håndværker",  x: "62%", y: "6%",  delay: "1.2s", anim: "animate-drift" },
  { icon: Truck,      label: "Flytning",    x: "78%", y: "44%", delay: "0.6s", anim: "animate-float-y" },
  { icon: Leaf,       label: "Have",        x: "4%",  y: "70%", delay: "2s",   anim: "animate-drift" },
  { icon: Zap,        label: "El",          x: "48%", y: "82%", delay: "0.3s", anim: "animate-float-y" },
  { icon: Paintbrush, label: "Maler",       x: "32%", y: "32%", delay: "1.8s", anim: "animate-drift" },
  { icon: Wrench,     label: "VVS",         x: "86%", y: "76%", delay: "1s",   anim: "animate-float-y" },
  { icon: HomeIcon,   label: "Bolig",       x: "20%", y: "52%", delay: "2.4s", anim: "animate-drift" },
];

const HeroSection = () => {
  return (
    <header className="relative z-30 isolate overflow-hidden bg-foreground text-background">
      {/* Baggrundsbillede — clipped i sit eget lag, så søgeforslag kan flyde ud over hero-kanten */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImage}
          alt="Professionel vinduespudser i gang med arbejdet"
          className="absolute inset-0 h-full w-full scale-105 object-cover"
          width={1280}
          height={960}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Mørkt læsbarhedslag */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/55 to-foreground/20" />
        <div className="absolute inset-0 bg-foreground/20" />

        {/* Animerede gradient-blobs i accent-farve — giver liv og dybde
            uden at flytte layoutet. Pointer-events deaktiveret så søgefelt
            og knapper stadig er fuldt klikbare. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-accent/35 blur-3xl mix-blend-screen animate-blob" />
          <div className="absolute top-1/3 right-[-6rem] h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-3xl mix-blend-screen animate-blob-slow [animation-delay:-4s]" />
          <div className="absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-background/20 blur-3xl mix-blend-overlay animate-blob [animation-delay:-8s]" />
        </div>

        {/* Subtilt prikket grid-overlay — giver hero en moderne tech-tekstur. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--background) / 0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse at 70% 40%, black 35%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 70% 40%, black 35%, transparent 75%)",
          }}
        />
      </div>

      {/* Flydende service-chips — kun synlige fra md og op, og kun i højre
          halvdel så de ikke konkurrerer med teksten. Ren dekoration. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block lg:w-[55%]">
        {FLOATING_CHIPS.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`absolute ${c.anim}`}
              style={{ left: c.x, top: c.y, animationDelay: c.delay }}
            >
              <div className="flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3.5 py-2 text-xs font-medium text-background backdrop-blur-md shadow-lg">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {c.label}
              </div>
            </div>
          );
        })}

        {/* Twinkling sparkles */}
        <Sparkles className="absolute left-[18%] top-[24%] h-5 w-5 text-accent animate-twinkle" />
        <Sparkle className="absolute right-[22%] top-[58%] h-4 w-4 text-background/80 animate-twinkle [animation-delay:1s]" />
        <Sparkles className="absolute right-[8%] top-[18%] h-4 w-4 text-accent animate-twinkle [animation-delay:2s]" />
      </div>

      {/* Indhold — venstrejusteret, matcher resten af forsidens sektioner */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          {/* Lille animeret "live"-badge over h1 — sætter en kvik og levende tone. */}
          <div className="animate-fade-in mb-5 inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-xs font-medium text-background backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Tusindvis af serviceydere klar nu
          </div>

          {/* Blid stagger-entry: titel → tekst → søgefelt → CTA. Korte
              durations + ease-out så det føles snappy, ikke tungt. */}
          <h1 className="animate-fade-in text-[2rem] font-semibold leading-[1.06] tracking-tight text-background sm:text-[3.25rem] lg:text-[3.75rem]">
            Find den rette{" "}
            <span
              className="bg-[linear-gradient(110deg,hsl(var(--accent))_0%,hsl(var(--background))_45%,hsl(var(--accent))_90%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan"
            >
              serviceyder
            </span>{" "}
            til opgaven.
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

      {/* Marquee-strip nederst — populære søgninger ruller blødt forbi.
          To kopier af listen sat efter hinanden så translateX(-50%) kan
          loope uden synligt spring. */}
      <div aria-hidden className="relative border-t border-background/10 bg-foreground/40 backdrop-blur-sm">
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee-slow gap-3 py-3 pr-3">
            {[...Array(2)].flatMap((_, dup) =>
              ["Rengøring", "Vinduespudser", "Maler", "Tømrer", "VVS", "Elektriker", "Flyttehjælp", "Havemand", "Skadedyr", "Murer", "Skorstensfejer", "Glarmester"].map((t, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-background/15 bg-background/5 px-3.5 py-1.5 text-xs font-medium text-background/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
