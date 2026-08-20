import { ArrowRight, Search, Building2 } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import SectionShell from "./SectionShell";

/**
 * To tydelige spor: private der skal have løst en opgave, og virksomheder
 * der skal drive og vokse deres forretning. Samme opdeling som i
 * navigationen, så brugeren aldrig er i tvivl om hvor de hører til.
 */
const TRACKS = [
  {
    icon: Search,
    eyebrow: "Til dig som kunde",
    title: "Få opgaven løst",
    body: "Find lokale virksomheder, sammenlign og book direkte — eller beskriv opgaven én gang og modtag op til 3 uforpligtende tilbud.",
    bullets: ["Gratis at bruge", "CVR-tjekkede virksomheder", "Direkte kontakt uden mellemled"],
    primary: { label: "Find services", to: "/virksomheder" },
    secondary: { label: "Indhent 3 tilbud", to: "/tilbud" },
    tone: "bg-card",
  },
  {
    icon: Building2,
    eyebrow: "Til servicevirksomheder",
    title: "Driv og udvid forretningen",
    body: "Ruteplanlægning, medarbejder-app, booking og fakturering i ét system — plus en profil på markedspladsen der sender nye kunder til jer.",
    bullets: ["14 dages gratis prøve", "Ingen binding", "Vi hjælper med at flytte jeres kunder ind"],
    primary: { label: "Se software", to: "/software" },
    secondary: { label: "Bliv udbyder", to: "/bliv-udbyder" },
    tone: "bg-sand",
  },
] as const;

const AudienceSplit = () => (
  <SectionShell
    eyebrow="To spor"
    title="Uanset om du skal have løst en opgave — eller løser dem"
    description="Serviceydere er både markedsplads for kunder og driftssystem for servicevirksomheder."
  >
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      {TRACKS.map((t) => (
        <div
          key={t.title}
          className={`flex flex-col rounded-2xl border border-border p-6 transition-shadow hover:shadow-lg sm:p-8 ${t.tone}`}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background" aria-hidden="true">
            <t.icon className="h-5 w-5" />
          </span>
          <span className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t.eyebrow}
          </span>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t.title}</h3>
          <p className="mt-2 text-[14px] leading-7 text-muted-foreground">{t.body}</p>
          <ul className="mt-5 space-y-2">
            {t.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px] text-foreground/85">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <SmartLink to={t.primary.to} className="sm:w-auto">
              <Button className="group h-10 w-full gap-2 rounded-full px-5 text-sm font-semibold sm:w-auto">
                {t.primary.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </SmartLink>
            <SmartLink to={t.secondary.to} className="sm:w-auto">
              <Button variant="outline" className="h-10 w-full rounded-full px-5 text-sm font-semibold sm:w-auto">
                {t.secondary.label}
              </Button>
            </SmartLink>
          </div>
        </div>
      ))}
    </div>
  </SectionShell>
);

export default AudienceSplit;
