import { INDUSTRIES, industryHref } from "../pages/software/industryRegistry";
import { BRANCHES, branchCities } from "../pages/cities/branchRegistry";
import { CITY_FACTS } from "../pages/cities/cityFacts";
import { CITIES } from "../pages/cities/cleaningCityData";
import { MOVING_CITIES } from "../pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "../pages/cities/handymanCityData";
import { GARDEN_CITIES } from "../pages/cities/gardenCityData";

/** Only actual registered public routes, never a Cartesian product of invented pages. */
export const indexableLocalAndIndustryPaths = () => [...new Set([
  ...INDUSTRIES.map(industryHref),
  "/by",
  ...CITY_FACTS.map(city => `/by/${city.slug}`),
  ...BRANCHES.flatMap(branch => branchCities(branch).map(city => `/${branch.kind}/${city.slug}`)),
  ...CITIES.map(city => `/rengoering/${city.slug}`),
  ...MOVING_CITIES.map(city => `/flyttehjaelp/${city.slug}`),
  ...HANDYMAN_CITIES.map(city => `/haandvaerker/${city.slug}`),
  ...GARDEN_CITIES.map(city => `/haveservice/${city.slug}`),
])];

export function missingIndexableContent(
  routes: { path: string; title: string; description: string }[],
  bodies: Record<string, string>,
): string[] {
  const metadata = new Map(routes.map(route => [route.path, route]));
  return indexableLocalAndIndustryPaths().filter(path => {
    const route = metadata.get(path);
    return !route?.title.trim() || !route.description.trim() || !bodies[path]?.trim();
  });
}