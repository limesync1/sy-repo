import { describe, expect, it } from "vitest";
import { BRANCHES, branchCities } from "./branchRegistry";
import { CITY_FACTS } from "./cityFacts";
import { servicesForCity } from "./cityServices";

describe("Registered local service links", () => {
  it("excludes the current service while retaining other services in the same city", () => {
    const links = servicesForCity("koebenhavn", "/elektriker/koebenhavn");
    expect(links.some(link => link.href === "/elektriker/koebenhavn")).toBe(false);
    expect(links.some(link => link.href === "/vvs/koebenhavn")).toBe(true);
    expect(links.every(link => link.href.endsWith("/koebenhavn"))).toBe(true);
  });

  it("only returns registered branch-city routes across all city hubs", () => {
    const registered = new Set(BRANCHES.flatMap(branch => branchCities(branch).map(city => `/${branch.kind}/${city.slug}`)));
    for (const city of CITY_FACTS) {
      const links = servicesForCity(city.slug);
      expect(new Set(links.map(link => link.href)).size).toBe(links.length);
      for (const branch of BRANCHES) {
        const href = `/${branch.kind}/${city.slug}`;
        expect(links.some(link => link.href === href)).toBe(registered.has(href));
      }
    }
    expect(servicesForCity("ukendt-by")).toEqual([]);
  });
});