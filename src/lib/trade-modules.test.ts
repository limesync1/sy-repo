import { describe, expect, it } from "vitest";
import { checklistProblems, isCraftBusiness, parseDanishNumber, parsePriceFile, readTradeModules } from "./trade-modules";

describe("håndværksmodul", () => {
  it("tilbydes kun håndværksbrancher", () => {
    expect(isCraftBusiness(["VVS"])).toBe(true);
    expect(isCraftBusiness(["Elektriker"])).toBe(true);
    expect(isCraftBusiness(["Vinduespudsning", "Facaderens"])).toBe(false);
    expect(isCraftBusiness(["Mobil cykelservice"])).toBe(false);
  });

  it("grossistpriser kræver at materialer er slået til", () => {
    expect(readTradeModules({ trade_modules: { wholesaler: true } }).wholesaler).toBe(false);
    expect(readTradeModules({ trade_modules: { materials: true, wholesaler: true } }).wholesaler).toBe(true);
  });

  it("læser danske tal", () => {
    expect(parseDanishNumber("1.234,50")).toBe(1234.5);
    expect(parseDanishNumber("12,5 kr")).toBe(12.5);
  });

  it("prisfil uden salgspris får kostpris + avance", () => {
    const r = parsePriceFile("Varenr;Beskrivelse;Enhed;Nettopris\n123;Kobberrør 15 mm;m;40,00\n;;;\n", 25);
    expect(r.rows).toEqual([{ sku: "123", name: "Kobberrør 15 mm", unit: "m", cost_price: 40, sale_price: 50 }]);
    expect(r.skipped).toBe(1);
  });

  it("salgspris i filen bruges uændret", () => {
    const r = parsePriceFile("Varenr,Navn,Nettopris,Salgspris\nA1,Stikkontakt,20,49.95", 25);
    expect(r.rows[0].sale_price).toBe(49.95);
  });

  it("påkrævede punkter skal besvares før afslutning", () => {
    expect(checklistProblems([{ id: "a", label: "Prøvetryk", type: "number", required: true }])).toEqual(["Prøvetryk"]);
    expect(checklistProblems([{ id: "a", label: "Prøvetryk", type: "number", required: true, value: "6" }])).toEqual([]);
  });
});
