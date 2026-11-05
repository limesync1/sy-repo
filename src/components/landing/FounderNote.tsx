import { ArrowRight, MessageCircle } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import portrait from "@/assets/william-ross-jepsen.jpg.asset.json";
import linkedinIcon from "@/assets/linkedin.svg";
import { Button } from "@/components/ui/button";
import { BrandedIllustration, type BrandedIllustrationName } from "@/components/shared/BrandedIllustration";
import BlueFlowBackground from "./BlueFlowBackground";

const reasons = [
  {
    icon: "localEasy" as BrandedIllustrationName,
    title: "Lokalt skal være let",
    text: "Det var alt for svært at finde en god, lokal serviceyder — og umuligt at se, hvem man kunne stole på.",
  },
  {
    icon: "fairBusinesses" as BrandedIllustrationName,
    title: "Fair for virksomhederne",
    text: "Dygtige små virksomheder drukner i dyre forespørgsler og tunge systemer. De fortjener ét simpelt værktøj.",
  },
  {
    icon: "humanHelp" as BrandedIllustrationName,
    title: "Et menneske, når du har brug for det",
    text: "Skriver du til kundeservice og vil tale med et menneske, er det mig, der svarer — hver gang.",
  },
];

/** Personlig sektion om grundlæggeren. Placeres lige over virksomhedssektionen. */
const FounderNote = () => {
  const openSupport = () => window.dispatchEvent(new CustomEvent("serviceydere:open-platform-chat"));

  return (
  <section className="home-founder brand-blue-section relative isolate py-12 text-ocean-foreground sm:py-14 lg:py-16 2xl:py-20">
    <BlueFlowBackground variant="founder" />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <div className="relative">
            <img
              src={portrait.url}
              alt="William Ross Jepsen, grundlægger af Serviceydere"
              loading="lazy"
              className="h-40 w-40 rounded-2xl object-cover shadow-lg ring-4 ring-background sm:h-48 sm:w-48"
            />
            <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Klar til at hjælpe
            </span>
          </div>
          <span className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-foreground/70">
            PERSONEN BAG SERVICEYDERE
          </span>
          <a
            href="https://www.linkedin.com/in/williamrossjepsen/"
            target="_blank"
            rel="noopener noreferrer me"
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ocean-foreground/90 underline-offset-4 hover:text-ocean-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-foreground/60"
            aria-label="William Ross Jepsen på LinkedIn (åbner i nyt vindue)"
          >
            <img src={linkedinIcon} alt="" aria-hidden="true" className="h-6 w-6 rounded" />
            Se min LinkedIn-profil
          </a>
          <h2 className="mt-3 text-[1.85rem] font-semibold leading-[1.1] text-ocean-foreground sm:text-[2.2rem]">
            Hej, jeg hedder William
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-ocean-foreground/80">
            Jeg har bygget og driver Serviceydere selv. Ingen store kontorer eller callcentre — bare én, der
            gerne vil gøre det nemt at få hjælp derhjemme og nemt at drive en servicevirksomhed.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            <Button
              type="button"
              variant="heroLight"
              onClick={openSupport}
              className="group h-11 gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" />
              Skriv til mig
            </Button>
            <Button asChild variant="heroDark" className="group h-11 rounded-lg px-4 font-semibold">
            <SmartLink to="/om-os">
              Læs historien
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SmartLink>
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-ocean-foreground">Derfor lavede jeg Serviceydere</h3>
          <ul className="mt-4 grid gap-3">
            {reasons.map((r) => (
              <li key={r.title} className="home-reason flex gap-4 rounded-lg border border-ocean-foreground/20 p-4 sm:p-5">
                <span className="icon-tile-glass h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                  <BrandedIllustration name={r.icon} className="h-full w-full" />
                </span>
                <div>
                  <p className="font-semibold text-ocean-foreground">{r.title}</p>
                  <p className="mt-1 text-[14px] leading-6 text-ocean-foreground/80">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
  );
};

export default FounderNote;
