import { ArrowUpRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import SectionShell from "./SectionShell";

/**
 * Byoversigt — genveje der både hjælper brugeren hurtigt videre og giver
 * søgemaskiner interne links til de mest søgte områder.
 *
 * Byerne er grupperet i landsdele, så listen læses som et kort over landet
 * i stedet for en tilfældig sky af knapper.
 */
const REGIONS = [
  {
    name: "Hovedstaden & Sjælland",
    cities: ["København", "Frederiksberg", "Roskilde", "Helsingør", "Næstved", "Slagelse"],
  },
  {
    name: "Fyn & Sydjylland",
    cities: ["Odense", "Esbjerg", "Kolding", "Vejle", "Fredericia", "Svendborg"],
  },
  {
    name: "Midt- & Nordjylland",
    cities: ["Aarhus", "Aalborg", "Randers", "Horsens", "Silkeborg", "Viborg"],
  },
];

const PopularCities = () => (
  <SectionShell
    tone="default"
    eyebrow="Hele Danmark"
    title="Se hvem der kører ud til dig"
    description="Vælg din by og få virksomhederne i dit område — med priser, anmeldelser og ledige tider."
    aside={
      <SmartLink
        to="/virksomheder"
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
      >
        Søg på alle byer
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </SmartLink>
    }
    compact
  >
    <div className="grid gap-8 border-t border-border/70 pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
      {REGIONS.map((region) => (
        <div key={region.name}>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {region.name}
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {region.cities.map((city) => (
              <li key={city}>
                <SmartLink
                  to={`/virksomheder?q=${encodeURIComponent(city)}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-2 text-[14px] font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/25"
                >
                  {city}
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </SectionShell>
);

export default PopularCities;
