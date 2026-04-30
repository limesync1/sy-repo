import SmartLink from "@/components/SmartLink";
import { ArrowRight, Building2, Users, Route, Calculator, Sparkles, ShieldCheck } from "lucide-react";

/**
 * Forretningsrettet sektion på forsiden — erstatter den tidligere
 * branche-grid og henvender sig direkte til virksomheder, som er den
 * primære indtægtskilde for platformen. Den fortæller kort hvad de får,
 * og linker til oprettelsesflowet via /log-ind?mode=business.
 */
const features = [
  {
    icon: Users,
    title: "Flere kunder, mindre administration",
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
    <section className="bg-secondary py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Building2 className="h-3 w-3 text-accent" />
              For virksomheder
            </span>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-foreground md:text-[2.25rem]">
              Drevet til at vækste din serviceforretning.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
              Få kunder, planlæg ruter og opkræv betaling fra ét samlet dashboard — og brug mindre tid på papirarbejde.
            </p>
          </div>
          <SmartLink
            to="/opret-virksomhed"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:self-auto"
          >
            <Sparkles className="h-4 w-4" />
            Opret din virksomhed
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article
              key={f.title}
              className="group flex h-full flex-col gap-4 rounded-[22px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.tone}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold leading-tight text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ForBusinesses;