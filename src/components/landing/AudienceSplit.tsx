import { ArrowRight, Search, Building2, Check } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import SectionShell from "./SectionShell";

/**
 * Orienteringssektion lige under heroen: Serviceydere er to ting, og
 * brugeren skal med det samme kunne se hvilken af dem der er deres.
 *
 * Den holder sig bevidst kort — de konkrete trin står i "Sådan virker det"
 * (kunder) og i sektionen for virksomheder længere nede, så vi ikke fortæller
 * det samme tre gange på én side.
 */
const TRACKS = [
  {
    icon: Search,
    kicker: "Jeg skal have en opgave løst",
    title: "Find hjælp til din opgave",
    body: "Søg efter en lokal virksomhed, sammenlign profiler og book direkte — eller beskriv opgaven og modtag op til tre tilbud.",
    points: ["Søg efter branche og by", "Sammenlign profiler og anmeldelser"],
    note: "Gratis og uforpligtende for kunder",
    primary: { label: "Find services", to: "/virksomheder" },
    secondary: { label: "Indhent 3 tilbud", to: "/tilbud" },
    tone: "bg-card text-foreground border-border",
    chip: "bg-foreground text-background",
  },
  {
    icon: Building2,
    kicker: "Jeg driver en servicevirksomhed",
    title: "Bliv synlig og saml driften",
    body: "Opret en virksomhedsprofil og brug systemet til kunder, booking, ruteplanlægning og fakturering.",
    points: ["Profil på markedspladsen", "Kunder og drift samlet ét sted"],
    note: "14 dages gratis prøve · intet betalingskort",
    primary: { label: "Se systemet", to: "/software" },
    secondary: { label: "Opret virksomhed", to: "/opret-virksomhed" },
    tone: "bg-card text-foreground border-border",
    chip: "bg-accent text-accent-foreground",
  },
] as const;

const AudienceSplit = () => (
  <SectionShell
    tone="muted"
    eyebrow="Vælg din vej"
    title="Hvad skal du bruge os til?"
    description="Find en virksomhed til din opgave, eller få værktøjerne til at drive din egen servicevirksomhed."
    compact
  >
    <div className="grid gap-4 lg:grid-cols-2">
      {TRACKS.map((t) => (
        <div
          key={t.title}
          className={`group flex min-h-[350px] flex-col rounded-lg border p-6 transition-colors hover:bg-secondary/45 sm:p-8 ${t.tone}`}
        >
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${t.chip}`}
            aria-hidden="true"
          >
            <t.icon className="h-5 w-5" />
          </span>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t.kicker}</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">{t.title}</h3>
          <p className="mt-3 max-w-lg text-[14.5px] leading-7 text-muted-foreground">{t.body}</p>
          <ul className="mt-5 space-y-2">
            {t.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <SmartLink
                to={t.primary.to}
                className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${t.chip}`}
              >
                {t.primary.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to={t.secondary.to}
                className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {t.secondary.label}
              </SmartLink>
            </div>
            <p className="mt-3.5 text-[12.5px] text-muted-foreground">{t.note}</p>
          </div>
        </div>
      ))}
    </div>
  </SectionShell>
);

export default AudienceSplit;
