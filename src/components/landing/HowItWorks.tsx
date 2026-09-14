import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

/**
 * "Sådan virker det" som en mørk tidslinje-bane.
 *
 * Sektionen er bevidst det ene mørke brud midt på forsiden: tre trin på en
 * vandret linje med store tal, så rejsen fra søgning til booking læses som én
 * bevægelse i stedet for tre løsrevne kort.
 */
const steps = [
  {
    icon: Search,
    title: "Søg efter en service",
    description: "Skriv hvad du har brug for — fx 'rengøring i Aarhus' eller 'flyttehjælp København'.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign udbydere",
    description: "Se priser, anmeldelser og afstand side om side, så du kan vælge den rigtige.",
  },
  {
    icon: CalendarCheck,
    title: "Book eller hent tilbud",
    description: "Book direkte på virksomhedens profil — eller indhent op til 3 gratis tilbud.",
  },
];

const HowItWorks = () => {
  return (
    <section
      className="relative isolate overflow-hidden py-16 text-background md:py-24"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(90% 80% at 15% 0%, hsl(var(--hero-mid) / 0.38) 0%, transparent 60%), radial-gradient(70% 70% at 95% 100%, hsl(var(--hero-cyan) / 0.14) 0%, transparent 65%)",
          }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-background/60">
            <span className="h-px w-6 bg-[hsl(var(--hero-cyan))]" />
            Sådan virker det
          </span>
          <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[2.35rem] lg:text-[2.75rem]">
            Fra søgning til booking på 5 minutter
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-background/70">
            Tre enkle trin — uden registrering, uden ventetid.
          </p>
        </div>

        <div className="relative mt-12 md:mt-16">
          {/* Tidslinjen der binder de tre trin sammen på desktop. */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[26px] hidden h-px md:block"
            style={{
              backgroundImage:
                "linear-gradient(90deg, hsl(var(--hero-cyan) / 0.55) 0%, hsl(var(--hero-cyan) / 0.2) 60%, transparent 100%)",
            }}
          />

          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <li key={step.title} className="relative pl-16 md:pl-0">
                <div className="flex items-center gap-4 md:block">
                  <span
                    className="absolute left-0 top-0 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-background/15 text-[15px] font-semibold tabular-nums text-background md:static md:h-[52px] md:w-[52px]"
                    style={{ backgroundColor: "hsl(var(--hero-bg))" }}
                  >
                    <step.icon className="h-5 w-5 text-[hsl(var(--hero-cyan-bright))]" />
                  </span>
                </div>
                <div className="md:mt-7">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/45">
                    Trin {i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-[14px] leading-6 text-background/65">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SmartLink
            to="/tilbud"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
          >
            Indhent 3 gratis tilbud
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-background/30 px-6 py-3 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 hover:bg-background/10"
          >
            Find virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
