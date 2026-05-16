import { describe, it, expect } from "vitest";
import {
  buildInterval,
  formatInterval,
  intervalBadgeClass,
  intervalToDays,
  parseInterval,
  toAgreementEnum,
  toLegacyEnum,
  unitLabel,
} from "./interval";

describe("parseInterval", () => {
  it("returns null for empty input", () => {
    expect(parseInterval(null)).toBeNull();
    expect(parseInterval(undefined)).toBeNull();
    expect(parseInterval("")).toBeNull();
  });

  it("recognises engangskøb", () => {
    expect(parseInterval("engangskøb")?.once).toBe(true);
    expect(parseInterval("once")?.once).toBe(true);
  });

  it("parses legacy enums", () => {
    expect(parseInterval("ugentlig")).toMatchObject({ n: 1, unit: "week" });
    expect(parseInterval("hver_14_dag")).toMatchObject({ n: 2, unit: "week" });
    expect(parseInterval("kvartalsvis")).toMatchObject({ n: 3, unit: "month" });
    expect(parseInterval("årlig")).toMatchObject({ n: 1, unit: "year" });
  });

  it("parses new every_N_unit format", () => {
    expect(parseInterval("every_6_day")).toMatchObject({ n: 6, unit: "day" });
    expect(parseInterval("every_3_week")).toMatchObject({ n: 3, unit: "week" });
    expect(parseInterval("every_2_month")).toMatchObject({ n: 2, unit: "month" });
    expect(parseInterval("every_1_year")).toMatchObject({ n: 1, unit: "year" });
  });

  it("parses flexible Danish interval keys and labels", () => {
    expect(parseInterval("hver_8_uge")).toMatchObject({ n: 8, unit: "week" });
    expect(parseInterval("Hver 2. uge")).toMatchObject({ n: 2, unit: "week" });
    expect(parseInterval("Hver 7. måned")).toMatchObject({ n: 7, unit: "month" });
    expect(parseInterval("Hvert 2. år")).toMatchObject({ n: 2, unit: "year" });
  });
});

describe("formatInterval", () => {
  it("formats engangskøb", () => {
    expect(formatInterval("engangskøb")).toBe("Engangskøb");
  });

  it("formats singular forms", () => {
    expect(formatInterval("daglig")).toBe("Dagligt");
    expect(formatInterval("ugentlig")).toBe("Ugentligt");
    expect(formatInterval("månedlig")).toBe("Månedligt");
    expect(formatInterval("årlig")).toBe("Årligt");
    expect(formatInterval("every_1_day")).toBe("Dagligt");
  });

  it("formats grammatical Danish for n>1", () => {
    expect(formatInterval("every_6_day")).toBe("Hver 6. dag");
    expect(formatInterval("hver_14_dag")).toBe("Hver 2. uge");
    expect(formatInterval("every_3_week")).toBe("Hver 3. uge");
    expect(formatInterval("kvartalsvis")).toBe("Hver 3. måned");
    expect(formatInterval("halvårlig")).toBe("Hver 6. måned");
    expect(formatInterval("every_2_year")).toBe("Hvert 2. år");
  });

  it("keeps labels when INTERVAL_LABELS is spread into local maps", async () => {
    const { INTERVAL_LABELS } = await import("@/types/service");
    const localMap: Record<string, string> = { ...INTERVAL_LABELS, engangskøb: "Engangskøb" };

    expect(localMap.hver_14_dag).toBe("Hver 2. uge");
    expect(localMap.ugentlig).toBe("Ugentligt");
  });
});

describe("intervalToDays", () => {
  it("converts all units to days", () => {
    expect(intervalToDays("engangskøb")).toBeNull();
    expect(intervalToDays("daglig")).toBe(1);
    expect(intervalToDays("ugentlig")).toBe(7);
    expect(intervalToDays("hver_14_dag")).toBe(14);
    expect(intervalToDays("kvartalsvis")).toBe(90);
    expect(intervalToDays("årlig")).toBe(365);
    expect(intervalToDays("every_6_day")).toBe(6);
    expect(intervalToDays("every_2_month")).toBe(60);
  });
});

describe("buildInterval / toLegacyEnum", () => {
  it("normalises common combinations to legacy enums", () => {
    expect(toLegacyEnum(buildInterval(1, "week"))).toBe("ugentlig");
    expect(toLegacyEnum(buildInterval(2, "week"))).toBe("hver_14_dag");
    expect(toLegacyEnum(buildInterval(3, "month"))).toBe("kvartalsvis");
    expect(toLegacyEnum(buildInterval(1, "year"))).toBe("årlig");
  });

  it("returns null for non-legacy combos", () => {
    expect(toLegacyEnum(buildInterval(5, "day"))).toBeNull();
    expect(toLegacyEnum(buildInterval(7, "month"))).toBeNull();
  });
});

describe("toAgreementEnum", () => {
  it("maps known values to legacy enum", () => {
    expect(toAgreementEnum("ugentlig")).toEqual({ interval: "ugentlig", interval_days: null });
    expect(toAgreementEnum("every_1_week")).toEqual({ interval: "ugentlig", interval_days: null });
  });

  it("falls back to custom + interval_days", () => {
    expect(toAgreementEnum("every_5_day")).toEqual({ interval: "custom", interval_days: 5 });
    expect(toAgreementEnum("every_7_month")).toEqual({ interval: "custom", interval_days: 210 });
  });
});

describe("unitLabel", () => {
  it("returns singular for 1 and plural otherwise", () => {
    expect(unitLabel(1, "day")).toBe("dag");
    expect(unitLabel(6, "day")).toBe("dage");
    expect(unitLabel(1, "week")).toBe("uge");
    expect(unitLabel(3, "week")).toBe("uger");
    expect(unitLabel(1, "month")).toBe("måned");
    expect(unitLabel(6, "month")).toBe("måneder");
    expect(unitLabel(1, "year")).toBe("år");
    expect(unitLabel(2, "year")).toBe("år");
  });
});

describe("intervalBadgeClass", () => {
  it("returns a class string for any input", () => {
    expect(intervalBadgeClass(null)).toMatch(/border/);
    expect(intervalBadgeClass("engangskøb")).toMatch(/border/);
    expect(intervalBadgeClass("every_6_day")).toMatch(/border/);
    expect(intervalBadgeClass("ugentlig")).toMatch(/blue/);
  });
});