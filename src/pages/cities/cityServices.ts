// Samler alle bysider pr. by til hubsiderne /by og /by/:city.
import { CITIES } from "./cleaningCityData";
import { MOVING_CITIES } from "./movingCityData";
import { HANDYMAN_CITIES } from "./handymanCityData";
import { GARDEN_CITIES } from "./gardenCityData";
import { BRANCHES, branchCities } from "./branchRegistry";
import { CITY_FACTS } from "./cityFacts";

export interface CityService { label: string; href: string }

const LEGACY: { label: string; base: string; list: { slug: string }[] }[] = [
  { label: "Rengøring", base: "rengoering", list: CITIES },
  { label: "Flyttehjælp", base: "flyttehjaelp", list: MOVING_CITIES },
  { label: "Håndværker", base: "haandvaerker", list: HANDYMAN_CITIES },
  { label: "Haveservice", base: "haveservice", list: GARDEN_CITIES },
];

export const servicesForCity = (slug: string): CityService[] => [
  ...LEGACY.filter((l) => l.list.some((c) => c.slug === slug)).map((l) => ({ label: l.label, href: `/${l.base}/${slug}` })),
  ...BRANCHES.filter((b) => branchCities(b).some((c) => c.slug === slug)).map((b) => ({ label: b.label, href: `/${b.kind}/${slug}` })),
];

export const HUB_CITIES = CITY_FACTS;
