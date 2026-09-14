import { ArrowRight, Search, Building2 } from "lucide-react";
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
    kicker: "Er du privat eller virksomhed med en opgave?",
    title: "Find og book en serviceyder",
    body: "Søg på branche og by, sammenlign priser og anmeldelser, og book direkte hos virksomheden. Du kan også beskrive opgaven én gang og få op til tre tilbud.",
    note: "Gratis at bruge · ingen binding",
    primary: { label: "Find services", to: "/virksomheder" },
    secondary: { label: "Indhent 3 tilbud", to: "/tilbud" },
    tone: "bg-feature-cool text-feature-cool-foreground",
    chip: "bg-feature-cool-foreground text-feature-cool",
  },
  {
    icon: Building2,
    kicker: "Driver du en servicevirksomhed?",
    title: "Få kunder og styr på driften",
    body: "Du får en profil på markedspladsen og et system til kunder, booking, ruteplanlægning og fakturering — samlet ét sted.",
    note: "14 dages gratis prøve · intet betalingskort",
    primary: { label: "Se systemet", to: "/software" },
    secondary: { label: "Opret virksomhed", to: "/opret-virksomhed" },
    tone: "bg-sand text-sand-foreground",
    chip: "bg-sand-foreground text-sand",
  },
] as const;

const AudienceSplit = () => (
  <SectionShell
    eyebrow="To måder at bruge Serviceydere"
    title="Hvad skal du bruge os til?"
    description="Serviceydere er både en markedsplads, hvor kunder finder lokale virksomheder — og det system, de virksomheder driver hverdagen i."
    compact
  >
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      {TRACKS.map((t) => (
        <div
          key={t.title}
          className={`flex flex-col rounded-[28px] p-6 transition-shadow duration-300 hover:shadow-[0_28px_56px_-40px_rgba(0,0,0,0.5)] sm:p-8 ${t.tone}`}
        >
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${t.chip}`}
            aria-hidden="true"
          >
            <t.icon className="h-5 w-5" />
          </span>

          <p className="mt-6 text-[13px] font-medium opacity-70">{t.kicker}</p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-[1.6rem]">{t.title}</h3>
          <p className="mt-3 max-w-md text-[14.5px] leading-7 opacity-85">{t.body}</p>

          <div className="mt-auto pt-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <SmartLink
                to={t.primary.to}
                className={`group inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${t.chip}`}
              >
                {t.primary.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to={t.secondary.to}
                className="inline-flex h-10 items-center rounded-full border border-current/25 px-5 text-sm font-semibold transition-colors hover:bg-background/40"
              >
                {t.secondary.label}
              </SmartLink>
            </div>
            <p className="mt-3.5 text-[12.5px] opacity-70">{t.note}</p>
          </div>
        </div>
      ))}
    </div>
  </SectionShell>
);

export default AudienceSplit;
