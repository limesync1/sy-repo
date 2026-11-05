import { describe, it, expect } from "vitest";
import { stepsForPlan, FULL_CORE_STEPS, LISTING_CORE_STEPS } from "./steps";

describe("Kom godt i gang-spor", () => {
  it("Kun profil indeholder aldrig rute-, medarbejder- eller regnskabstrin", () => {
    const { core, next } = stepsForPlan("listing");
    const ids = [...core, ...next].map((s) => s.id);
    for (const banned of ["route", "employees", "accounting", "order", "employee_app"]) expect(ids).not.toContain(banned);
  });
  it("Fuldt system følger rækkefølgen brancher → services → medarbejdere → bestilling → rute", () => {
    const ids = FULL_CORE_STEPS.map((s) => s.id);
    expect(ids.indexOf("categories")).toBeLessThan(ids.indexOf("services"));
    expect(ids.indexOf("services")).toBeLessThan(ids.indexOf("order"));
    expect(ids.indexOf("employees")).toBeLessThan(ids.indexOf("route"));
    expect(ids.indexOf("order")).toBeLessThan(ids.indexOf("route"));
  });
  it("hvert krav peger på et tidligere trin i samme spor", () => {
    for (const steps of [FULL_CORE_STEPS, LISTING_CORE_STEPS]) {
      const tabs = steps.map((s) => s.tab({} as never));
      steps.forEach((s, i) => (s.requires ?? []).forEach((r) => expect(tabs.slice(0, i)).toContain(r.tab)));
    }
  });
  it("antal obligatoriske trin: 7 for fuldt system, 5 for kun profil", () => {
    expect(stepsForPlan("full").core).toHaveLength(7);
    expect(stepsForPlan("listing").core).toHaveLength(5);
  });
});
