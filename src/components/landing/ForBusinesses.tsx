import SmartLink from "@/components/SmartLink";
import {
  ArrowRight,
  Users,
  Route,
  Calculator,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Check,
} from "lucide-react";

/**
 * Forretningsrettet sektion på forsiden. Bento-layout med ét stort, mørkt
 * "premium" hero-tile + 4 feature-kort. Den mørke kasse matcher hero/footer
 * og giver siden en tydelig rytme i stedet for den tidligere flade 4-grid.
 */
const features = [
  {
    icon: Users,
    title: "Flere kunder, mindre admin",
    text: "Bliv synlig for kunder der allerede leder efter dine ydelser i dit område.",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Route,
    title: "Indbygget ruteplanlægning",
    text: "Optimér daglige ruter for medarbejdere og spar tid hver eneste uge.",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: Calculator,
    title: "Smart prisberegner",
    text: "Lad kunder selv beregne prisen og bestille — uden tilbudsrunder.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Verificeret profil",
    text: "CVR-tjek og verifikation styrker tilliden hos nye kunder fra dag ét.",
    tone: "bg-accent-soft text-accent",
  },
];

const ForBusinesses = () => {
  return (
    <section className="bg-secondary py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              For virksomheder
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
              Drevet til at vækste din serviceforretning.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Få kunder, planlæg ruter og opkræv betaling fra ét samlet dashboard — og brug mindre tid på papirarbejde.
            </p>
          </div>
          <SmartLink
            to="/opret-virksomhed"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:-translate-y-0.5 md:self-auto"
          >
            <Sparkles className="h-4 w-4" />
            Opret din virksomhed
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>

        {/* Bento: stor mørk premium-tile + 4 features. */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Hero-tile — fylder 2 kolonner på desktop, fuld bredde på mobil. */}
          <article
            className="relative isolate overflow-hidden rounded-[28px] p-8 sm:p-10 lg:col-span-2 lg:row-span-2 text-background"
            style={{ backgroundColor: "hsl(var(--hero-bg))" }}
          >
            {/* Ambient glows for premium-følelse */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div
                className="absolute -top-24 -right-24 h-[26rem] w-[26rem] rounded-full blur-[110px] opacity-40"
                style={{ backgroundColor: "hsl(var(--hero-mid))" }}
              />
              <div
                className="absolute -bottom-32 -left-16 h-[22rem] w-[22rem] rounded-full blur-[100px] opacity-25"
                style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
              />
              <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
            </div>

            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-md">
                <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/85 backdrop-blur">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }}
                  />
                  Alt-i-én panel
                </span>
                <h3 className="mt-4 text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2rem]">
                  Drift hele forretningen{" "}
                  <span className="bg-[linear-gradient(110deg,hsl(var(--hero-cyan))_0%,hsl(var(--hero-cyan-bright))_50%,hsl(var(--hero-cyan))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
                    fra ét sted.
                  </span>
                </h3>
                <p className="mt-3 text-sm leading-6 text-background/75 sm:text-[15px]">
                  Kunder, aftaler, ruter, fakturaer og medarbejdere — uden at hoppe mellem fem værktøjer.
                </p>

                <ul className="mt-6 space-y-2.5 text-sm text-background/90">
                  {[
                    "Profil der scorer i søgning",
                    "Live kalender og ruteplan",
                    "Automatisk fakturering",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "hsl(var(--hero-cyan-bright) / 0.18)" }}
                      >
                        <Check className="h-3 w-3" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mini "stats"-panel — illuderer panelet i virkeligheden. */}
              <div className="w-full max-w-xs shrink-0 rounded-2xl border border-background/15 bg-background/[0.04] p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/60">
                    Denne uge
                  </span>
                  <TrendingUp className="h-4 w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-semibold tabular-nums">42.180 kr</div>
                  <div className="mt-1 text-xs text-background/65">Planlagt omsætning</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-background/10 pt-4 text-left">
                  <div>
                    <div className="text-lg font-semibold tabular-nums">18</div>
                    <div className="text-[11px] text-background/60">Aftaler</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold tabular-nums">4 t 20 m</div>
                    <div className="text-[11px] text-background/60">Kørsel</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SmartLink
                to="/opret-virksomhed"
                className="group inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Kom i gang gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <span className="text-xs text-background/60">14 dages prøveperiode · ingen binding.</span>
            </div>
          </article>

          {/* 4 feature-kort i den højre kolonne på desktop, 2x2 grid på mindre. */}
          {features.map((f) => (
            <article
              key={f.title}
              className="group flex h-full flex-col gap-4 rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold leading-tight text-foreground">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ForBusinesses;