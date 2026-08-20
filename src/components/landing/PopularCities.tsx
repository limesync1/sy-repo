import { MapPin } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import SectionShell from "./SectionShell";

/**
 * Populære byer — genveje der både hjælper brugeren hurtigt videre og
 * giver søgemaskiner interne links til de mest søgte områder.
 * Søgningen bruger fritekst (`?q=`), som søgesiden allerede understøtter.
 */
const CITIES = [
  "København", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers",
  "Kolding", "Horsens", "Vejle", "Roskilde", "Herning", "Helsingør",
  "Silkeborg", "Næstved", "Fredericia", "Viborg",
];

const PopularCities = () => (
  <SectionShell
    tone="muted"
    eyebrow="Hele Danmark"
    title="Find serviceydere i din by"
    description="Vælg din by og se hvilke virksomheder der kører ud til dig."
    compact
  >
    <div className="flex flex-wrap gap-2">
      {CITIES.map((city) => (
        <SmartLink
          key={city}
          to={`/virksomheder?q=${encodeURIComponent(city)}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-sm"
        >
          <MapPin className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-accent" aria-hidden="true" />
          {city}
        </SmartLink>
      ))}
    </div>
  </SectionShell>
);

export default PopularCities;
