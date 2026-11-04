import { describe, expect, it } from "vitest";
import { GARDEN_CITIES } from "./gardenCityData";
import { gardenCityExample, gardenCityFaq } from "./GardenCityExtras";

describe("haveservice-bysider", () => {
  it("regneeksempel bruger byens egne priser (Odense)", () => {
    const odense = GARDEN_CITIES.find(c => c.slug === "odense")!;
    const ex = gardenCityExample(odense);
    expect(ex.low).toBe(14 * 295 + 60 * 28);
    expect(ex.high).toBe(14 * 650 + 60 * 62);
  });
  it("hver by får sin egen FAQ med bynavn", () => {
    for (const city of GARDEN_CITIES) expect(gardenCityFaq(city)[0][0]).toContain(city.name);
  });
});
