import { ArrowRight, Search, Building2, Check } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SectionShell from "./SectionShell";

/**
 * To konkrete spor: kunden der skal have løst en opgave, og virksomheden der
 * skal drive forretningen. Hvert spor viser præcis hvad man gør, hvad det
 * koster, og hvad næste skridt er — ingen løse løfter.
 */
const TRACKS = [
  {
    icon: Search,
    eyebrow: "Jeg skal have løst en opgave",
    title: "Find og book en serviceyder",
    price: "Gratis for private",
    priceNote: "Ingen gebyrer, ingen binding",
    steps: [
      "Vælg branche og by — fx rengøring i Aarhus",
      "Sammenlign profiler, priser og anmeldelser",
      "Book direkte, eller få op til 3 tilbud",
    ],
    primary: { label: "Find services", to: "/virksomheder" },
    secondary: { label: "Indhent 3 tilbud", to: "/tilbud" },
    tone: "bg-feature-cool text-feature-cool-foreground",
    chip: "bg-feature-cool-foreground text-feature-cool",
  },
  {
    icon: Building2,
    eyebrow: "Jeg driver en servicevirksomhed",
    title: "Få system og nye kunder ét sted",
    price: "14 dages gratis prøve",
    priceNote: "Derefter vælger I selv om I fortsætter",
    steps: [
      "Opret virksomheden og få en profil på markedspladsen",
      "Planlæg ruter, medarbejdere og booking i ét system",
      "Vores support flytter jeres eksisterende kunder ind",
    ],
    primary: { label: "Se software", to: "/software" },
    secondary: { label: "Bliv udbyder", to: "/bliv-udbyder" },
    tone: "bg-sand text-sand-foreground",
    chip: "bg-sand-foreground text-sand",
  },
] as const;

const AudienceSplit = () => (
  <SectionShell
    eyebrow="Vælg dit spor"
    title="Hvad skal du bruge Serviceydere til?"
    description="Serviceydere er to ting: en markedsplads hvor private finder lokale virksomheder — og et driftssystem til de virksomheder."
  >
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      {TRACKS.map((t) => (
        <div
          key={t.title}
          className={`flex flex-col rounded-[28px] border border-border/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-34px_rgba(0,0,0,0.45)] sm:p-8 ${t.tone}`}
        >
          <div className="flex items-start justify-between gap-4">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${t.chip}`} aria-hidden="true">
              <t.icon className="h-5 w-5" />
            </span>
            <div className="text-right">
              <div className="text-sm font-bold">{t.price}</div>
              <div className="text-[11px] opacity-70">{t.priceNote}</div>
            </div>
          </div>

          <span className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
            {t.eyebrow}
          </span>
          <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h3>

          <ol className="mt-6 space-y-3">
            {t.steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-[14px] leading-6">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${t.chip}`}>
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <SmartLink to={t.primary.to} className="sm:w-auto">
              <Button className="group h-10 w-full gap-2 rounded-full px-5 text-sm font-semibold sm:w-auto">
                {t.primary.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </SmartLink>
            <SmartLink to={t.secondary.to} className="sm:w-auto">
              <Button variant="outline" className="h-10 w-full rounded-full border-current/30 bg-transparent px-5 text-sm font-semibold hover:bg-background/40 sm:w-auto">
                {t.secondary.label}
              </Button>
            </SmartLink>
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] opacity-70">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            CVR-tjekkede virksomheder · dansk support
          </p>
        </div>
      ))}
    </div>
  </SectionShell>
);

export default AudienceSplit;
