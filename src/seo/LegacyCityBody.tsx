import { CityFactsBox } from "@/pages/cities/CityFactsBox";
import { GardenCityExtras } from "@/pages/cities/GardenCityExtras";
import { CITIES } from "../pages/cities/cleaningCityData";
import { MOVING_CITIES } from "../pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "../pages/cities/handymanCityData";
import { GARDEN_CITIES } from "../pages/cities/gardenCityData";
import { citySeo, type LegacyCityKind } from "./city-seo";

export const legacyCityGroups = [
  { kind: "rengoering" as const, label: "Rengøring", guide: "/priser/rengoering", cities: CITIES },
  { kind: "flyttehjaelp" as const, label: "Flyttehjælp", guide: "/priser/flyttehjaelp", cities: MOVING_CITIES },
  { kind: "haandvaerker" as const, label: "Håndværker", guide: "/priser/haandvaerker", cities: HANDYMAN_CITIES },
  { kind: "haveservice" as const, label: "Haveservice", guide: "/priser/haveservice", cities: GARDEN_CITIES },
];
type City = (typeof legacyCityGroups)[number]["cities"][number];
const range = (low: number, high: number) => `${low.toLocaleString("da-DK")}–${high.toLocaleString("da-DK")} kr.`;

/** Existing city-specific facts only; no guessed providers, offers or timestamps. */
export function LegacyCityBody({ kind, city }: { kind: LegacyCityKind; city: City }) {
  const group = legacyCityGroups.find(group => group.kind === kind);
  if (!group) return null;
  const rows: [string, string][] = [[kind === "flyttehjaelp" ? "To mænd og bil" : "Timepris", `${range(city.hourlyLow, city.hourlyHigh)}/time`]];
  if ("flatLow" in city) rows.push(["Fast rengøring, 75 m² hver 14. dag", range(city.flatLow, city.flatHigh)]);
  if ("smallMoveLow" in city) rows.push(["Lejlighed, 1–2 værelser", range(city.smallMoveLow, city.smallMoveHigh)], ["Villa, 4–5 værelser", range(city.villaMoveLow, city.villaMoveHigh)]);
  if ("carpenterLow" in city) rows.push(["Tømrer", `${range(city.carpenterLow, city.carpenterHigh)}/time`], ["Elektriker", `${range(city.electricianLow, city.electricianHigh)}/time`], ["Udkald", range(city.callOutLow, city.callOutHigh)]);
  if ("lawnLow" in city) rows.push(["Græsslåning", `${range(city.lawnLow, city.lawnHigh)}/besøg`], ["Hækklipning", `${range(city.hedgeLow, city.hedgeHigh)}/løbende meter`]);
  const tasks = "popularTasks" in city ? city.popularTasks : "popularRoutes" in city ? city.popularRoutes : city.neighborhoods;
  return <article>
    <h1>{group.label} i {city.name}</h1>
    <p>{city.intro}</p><p>{city.localFactor}</p>
    <h2>Vejledende priser i {city.name}</h2>
    <p>Prisintervallerne er vejledende; få et tilbud på din konkrete opgave.</p>
    <table><thead><tr><th>Opgave</th><th>Pris inkl. moms</th></tr></thead><tbody>{rows.map(([label, price]) => <tr key={label}><td>{label}</td><td>{price}</td></tr>)}</tbody></table>
    <h2>{kind === "flyttehjaelp" ? "Populære flytteruter" : kind === "rengoering" ? "Områder" : "Populære opgaver"} i {city.name}</h2>
    <ul>{tasks.map(task => <li key={task}>{task}</li>)}</ul>
    {kind === "haveservice" && "lawnLow" in city && <GardenCityExtras city={city} />}
    <p>Postnumre: {city.postalRange}. Region: {city.region}.</p>
    <nav aria-label="Lokale services og prisguides"><ul>
      <li><a href={group.guide}>Prisguide til {group.label.toLowerCase()}</a></li>
      <li><a href={`/by/${city.slug}`}>Alle services i {city.name}</a></li>
      <li><a href="/tilbud">Få op til 3 gratis tilbud</a></li>
      {group.cities.filter(other => other.slug !== city.slug).map(other => <li key={other.slug}><a href={citySeo(kind, other).path}>{group.label} i {other.name}</a></li>)}
    </ul></nav>
  <CityFactsBox slug={city.slug} name={city.name} />
  </article>;
}