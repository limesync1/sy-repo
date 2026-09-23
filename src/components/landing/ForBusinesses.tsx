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
    <section className="bg-secondary py-12 sm:py-14 lg:py-16 2xl:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between 2xl:mb-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              For virksomheder
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] text-foreground sm:text-[2.2rem] lg:text-[2.4rem] 2xl:mt-5 2xl:text-[2.75rem]">
              Alt du skal bruge for at drive din servicevirksomhed
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Få nye kunder, planlæg dagens ruter og send fakturaer fra ét panel. Start med {p.trial_days} dages
              gratis prøve — uden betalingskort og uden binding.
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
            className="relative isolate overflow-hidden rounded-2xl p-6 sm:p-8 lg:col-span-3 2xl:rounded-[28px] 2xl:p-10 text-background"
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

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch lg:gap-8 2xl:gap-12">
              <div className="max-w-xl">
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
              <div className="flex w-full flex-col rounded-2xl border border-background/15 bg-background/[0.04] p-5 backdrop-blur">
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
                <p className="mt-auto pt-4 text-[10px] leading-4 text-background/55">
                  Skærmbillede til illustration — dine tal afhænger af opgavevolumen.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SmartLink
                to="/opret-virksomhed"
                className="group inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Prøv gratis i {p.trial_days} dage
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <span className="text-xs text-background/80">
                Ingen betalingskort ved start · ingen binding · derefter {kr(p.base_price_dkk)} kr/md.
              </span>
            </div>

          </article>

          {/* 4 feature-kort i den højre kolonne på desktop, 2x2 grid på mindre. */}
          {features.map((f) => (
            <article
              key={f.title}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border 2xl:gap-4 2xl:p-6"
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

        {/* Prismodel i kort form — de fulde detaljer står på prissiden, så
            forsiden ikke bliver til en prisliste. Tallene kommer fra samme
            kilde som /software/priser. */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border/70 bg-card 2xl:mt-14 2xl:rounded-[28px]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center 2xl:gap-8 2xl:p-10">
            <div>
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Prismodel
              </span>
              <h3 className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[1.9rem]">
                Én fast månedspris — ingen skjulte gebyrer
              </h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-7 text-muted-foreground">
                Du betaler først efter de {p.trial_days} gratis dage, og du vælger selv om du vil fortsætte.
                Alle priser er uden moms.
              </p>
              <SmartLink
                to="/software/priser"
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
              >
                Beregn jeres pris
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  value: `${kr(p.base_price_dkk)} kr`,
                  unit: "pr. måned",
                  label: "Basis med profil, kunder, booking, ruteplanlægning og 1 medarbejderlogin",
                  strong: true,
                },
                {
                  value: `+${kr(p.price_per_employee_login_dkk)} kr`,
                  unit: "pr. måned",
                  label: "Pr. ekstra medarbejder ud over den første",
                },
                {
                  value: `${kr(p.startup_fee_dkk)} kr`,
                  unit: "engangsbeløb",
                  label: "Opstart — betales først på den første faktura efter prøveperioden",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl p-5 ${
                    item.strong ? "bg-foreground text-background" : "border border-border bg-background"
                  }`}
                >
                  <div className="text-2xl font-semibold tabular-nums tracking-tight">{item.value}</div>
                  <div className={`mt-0.5 text-[12px] ${item.strong ? "text-background/70" : "text-muted-foreground"}`}>
                    {item.unit}
                  </div>
                  <p
                    className={`mt-3 text-[13px] leading-5 ${
                      item.strong ? "text-background/85" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 bg-secondary/50 px-7 py-5 text-[13px] leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4 shrink-0" />
              Skal vi flytte jeres nuværende kunder og aftaler ind? Send listen — vi lægger dem ind gratis.
            </span>
            <span>Regnskabsintegration til e-conomic eller Dinero: +{kr(p.price_accounting_integration_dkk)} kr/md.</span>
          </div>
        </div>
      </div>

    </section>

  );
};

export default ForBusinesses;