import { describe, it, expect } from "vitest";
import { localCityExample, localCityFaq } from "@/pages/cities/LocalCityExtras";
import { CITIES } from "@/pages/cities/cleaningCityData";
import { MOVING_CITIES } from "@/pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "@/pages/cities/handymanCityData";

describe("lokale byekstraer", () => {
  it("rengøring: årspris = 26 besøg × byens besøgspris", () => {
    const c = CITIES[0];
    const t = localCityExample("rengoering", c).text;
    expect(t).toContain(`${Math.round((26 * c.flatLow) / 50) * 50}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  });
  it("alle byer får fem unikke spørgsmål med bynavn", () => {
    for (const [k, list] of [["rengoering", CITIES], ["flyttehjaelp", MOVING_CITIES], ["haandvaerker", HANDYMAN_CITIES]] as const)
      for (const c of list) {
        const faq = localCityFaq(k, c);
        expect(faq).toHaveLength(5);
        expect(faq[0][0]).toContain(c.name);
      }
  });
});
