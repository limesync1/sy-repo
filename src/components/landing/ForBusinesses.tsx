import SmartLink from "@/components/SmartLink";
import { usePlatformPricing } from "@/hooks/useBusinessPlan";
import {
  ArrowRight,
  Users,
  Route,
  Calculator,
  Sparkles,
  TrendingUp,
  Check,
  Upload,
} from "lucide-react";

/**
 * Forretningsrettet sektion på forsiden. Bento-layout med ét stort, mørkt
 * "premium" hero-tile + 4 feature-kort. Den mørke kasse matcher hero/footer
 * og giver siden en tydelig rytme i stedet for den tidligere flade 4-grid.
 *
 * Priserne hentes fra get_platform_pricing (samme kilde som /software/priser
 * og /opret-virksomhed), så forsiden aldrig kan komme i modstrid med den
 * fakturering kunderne faktisk møder.
 */
const PRICING_FALLBACK = {
  base_price_dkk: 289,
  price_accounting_integration_dkk: 269,
  price_data_import_dkk: 1495,
  price_per_employee_login_dkk: 59,
  startup_fee_dkk: 2269,
  trial_days: 14,
};

const kr = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n));

const features = [
  {
    icon: Users,
    title: "Flere kunder i dit område",
    text: "Bliv vist for private og virksomheder der søger efter præcis dine ydelser lokalt — uden at betale for klik.",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Route,
    title: "Ruteplanlægning inkluderet",
    text: "Planlæg dagens stop, optimer kørerækkefølgen og send ruten direkte til medarbejderens telefon. Inkluderet i basis — ikke et tilkøb.",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: Calculator,
    title: "Indbygget prisberegner",
    text: "Tilføj en prisberegner til dine ydelser, så kunden selv kan udfylde m², timer eller antal og se prisen før de booker.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
];


const ForBusinesses = () => {
  const { data: pricing } = usePlatformPricing();
  const p = { ...PRICING_FALLBACK, ...(pricing ?? {}) };

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
              Find nye kunder, planlæg dagens ruter og send fakturaer — fra ét samlet panel. {p.trial_days} dages gratis prøve uden betalingskort, og ingen binding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <SmartLink
              to="/opret-virksomhed"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Opret din virksomhed
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SmartLink>
            <SmartLink
              to="/software"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Se systemet og priserne
            </SmartLink>
          </div>
        </div>

        {/* Hero-tile øverst i fuld bredde + 3 feature-kort under. Ingen tomme celler. */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Hero-tile — altid fuld bredde øverst. */}
          <article
            className="relative isolate overflow-hidden rounded-[28px] p-8 sm:p-10 lg:col-span-3 text-background"
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
                <p className="mt-3 text-sm leading-6 text-background/85 sm:text-[15px]">
                  Kundekartotek, bookingkalender, ruteplanlægning, fakturering og medarbejderlogins — i ét panel, så du slipper for at hoppe mellem fem forskellige systemer.
                </p>

                <ul className="mt-6 space-y-2.5 text-sm text-background/90">
                  {[
                    "Egen virksomhedsprofil med søgesynlighed på Google",
                    "Bookingkalender og ruteplanlægning til medarbejdere",
                    "Automatisk fakturering med e-conomic & Dinero",
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

              {/* Mini "stats"-panel — illustration af dashboardet (eksempeltal). */}
              <div className="w-full max-w-xs shrink-0 rounded-2xl border border-background/15 bg-background/[0.04] p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/75">
                    Eksempel · denne uge
                  </span>
                  <TrendingUp className="h-4 w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-semibold tabular-nums">42.180 kr</div>
                  <div className="mt-1 text-xs text-background/80">Planlagt omsætning</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-background/10 pt-4 text-left">
                  <div>
                    <div className="text-lg font-semibold tabular-nums">18</div>
                    <div className="text-[11px] text-background/75">Aftaler</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold tabular-nums">4 t 20 m</div>
                    <div className="text-[11px] text-background/75">Kørsel</div>
                  </div>
                </div>
                <p className="mt-4 text-[10px] leading-4 text-background/55">
                  Skærmbillede til illustration — dine tal afhænger af opgavevolumen.
                </p>
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
              <span className="text-xs text-background/80">14 dages prøveperiode · ingen binding.</span>
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

        {/* Gennemsigtig prismodel — vist tydeligt så virksomheder ved præcis hvad de betaler. */}
        <div className="mt-16 rounded-[28px] border border-border/70 bg-card p-8 sm:p-10">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Prismodel
              </span>
              <h3 className="mt-3 text-[1.6rem] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[2rem]">
                Én fast pris. Ingen skjulte gebyrer.
              </h3>
              <p className="mt-2 max-w-xl text-[14.5px] leading-6 text-muted-foreground">
                14 dages gratis prøveperiode uden binding. Opstartsgebyret betales først på første faktura efter prøveperioden.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Basis */}
            <div className="rounded-2xl border-2 border-foreground/90 bg-background p-6">
              <div className="flex items-baseline justify-between">
                <h4 className="text-base font-semibold text-foreground">Basis</h4>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Påkrævet</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums text-foreground">289</span>
                <span className="text-sm text-muted-foreground">kr/md</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Engangs opstartsgebyr: 2.269 kr (på første faktura)</p>
              <ul className="mt-5 space-y-2 text-[13.5px] text-foreground">
                {[
                  "Virksomhedsprofil med søgesynlighed",
                  "Ruteplanlægning + medarbejder-app",
                  "Kundekartotek og bookingkalender",
                  "Leads og livechat — gratis at slå til/fra",
                  "1 medarbejderlogin inkluderet",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tilvalg */}
            <div className="rounded-2xl border border-border bg-background p-6">
              <h4 className="text-base font-semibold text-foreground">Tilvalg — kun det du bruger</h4>
              <p className="mt-1 text-xs text-muted-foreground">Slå til/fra når som helst i panelet.</p>

              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">Regnskabsintegration</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Automatiske fakturaer til e-conomic eller Dinero.</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-semibold tabular-nums text-foreground">+269 kr</div>
                    <div className="text-[11px] text-muted-foreground">/md</div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">Ekstra medarbejderlogin</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Pris pr. ekstra medarbejder ud over den ene inkluderede.</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-semibold tabular-nums text-foreground">+59 kr</div>
                    <div className="text-[11px] text-muted-foreground">/md pr. stk</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-muted/60 p-3 text-[12.5px] leading-5 text-muted-foreground">
                Nedjusteringer (færre logins eller deaktivering af regnskab) låses 3 dage før fakturering og træder i kraft fra næste periode — så du betaler altid for det du faktisk har brugt.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForBusinesses;