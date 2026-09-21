import { describe, expect, it } from "vitest";
import {
  computeFlex,
  evaluateMove,
  findSpeedOpportunity,
  parseTimeToMin,
  simulateOrder,
  suggestOrder,
  type FlexStop,
} from "./routeSlack";

const stop = (
  id: string,
  lat: number,
  lng: number,
  extra: Partial<FlexStop> = {},
): FlexStop => ({
  id,
  status: "pending",
  latitude: lat,
  longitude: lng,
  duration_minutes: 30,
  ...extra,
});

describe("parseTimeToMin", () => {
  it("læser HH:MM og HH:MM:SS", () => {
    expect(parseTimeToMin("08:30")).toBe(510);
    expect(parseTimeToMin("14:05:00")).toBe(845);
    expect(parseTimeToMin(null)).toBeNull();
    expect(parseTimeToMin("ikke en tid")).toBeNull();
  });
});

describe("simulateOrder", () => {
  it("lægger køretid og servicetid sammen", () => {
    const sim = simulateOrder(
      [stop("a", 56.14, 9.0), stop("b", 56.20, 9.1)],
      [56.13, 8.99],
      9 * 60,
    );
    expect(sim.totalKm).toBeGreaterThan(0);
    expect(sim.totalMin).toBeGreaterThan(60); // 2 × 30 min service + kørsel
    expect(sim.arrivals).toHaveLength(2);
    expect(sim.arrivals[1]).toBeGreaterThan(sim.arrivals[0]);
  });

  it("tæller overskredne tidsvinduer", () => {
    const sim = simulateOrder(
      [stop("a", 56.14, 9.0, { time_window_end: "08:00" })],
      [56.13, 8.99],
      12 * 60,
    );
    expect(sim.violations).toBe(1);
  });
});

describe("computeFlex", () => {
  it("giver 'Fri tid' når der ikke er tidsvinduer", () => {
    const flex = computeFlex([stop("a", 56.14, 9.0), stop("b", 56.2, 9.1)], [56.13, 8.99], 9 * 60);
    expect(flex.every((f) => f.level === "flexible")).toBe(true);
    expect(flex[0].slackMin).toBeNull();
  });

  it("propagerer slæk bagfra: et stramt stop sent på ruten låser de tidligere", () => {
    const stops = [
      stop("a", 56.14, 9.0),
      stop("b", 56.145, 9.005),
      stop("c", 56.15, 9.01, { time_window_end: "10:15" }),
    ];
    const flex = computeFlex(stops, [56.13, 8.99], 9 * 60);
    expect(flex[2].slackMin).not.toBeNull();
    // Alle tre deler samme begrænsning fra stop c.
    expect(flex[0].slackMin).toBeCloseTo(flex[2].slackMin!, 5);
    expect(flex[0].level).not.toBe("late");
  });

  it("markerer for sent når vinduet allerede er overskredet", () => {
    const flex = computeFlex(
      [stop("a", 56.14, 9.0, { time_window_end: "09:00" })],
      [56.13, 8.99],
      12 * 60,
    );
    expect(flex[0].level).toBe("late");
    expect(flex[0].label).toContain("for sent");
  });
});

describe("evaluateMove", () => {
  const stops = [
    stop("langt", 56.40, 9.40),
    stop("tæt-1", 56.135, 8.995),
    stop("tæt-2", 56.137, 8.997),
  ];

  it("flytning af et fjernt stop bagerst sparer tid", () => {
    const res = evaluateMove(stops, 0, 2, [56.13, 8.99], 9 * 60);
    expect(res.deltaMin).toBeLessThan(0);
    expect(res.feasible).toBe(true);
    expect(res.order.map((s) => s.id)).toEqual(["tæt-1", "tæt-2", "langt"]);
  });

  it("advarer når flytningen bryder et tidsvindue", () => {
    const withWindow = [
      stop("fast", 56.40, 9.40, { time_window_end: "09:40" }),
      stop("fri-1", 56.135, 8.995),
      stop("fri-2", 56.137, 8.997),
    ];
    const res = evaluateMove(withWindow, 0, 2, [56.13, 8.99], 9 * 60);
    expect(res.feasible).toBe(false);
    expect(res.brokenStopId).toBe("fast");
  });
});

describe("suggestOrder / findSpeedOpportunity", () => {
  it("samler nære stop og lægger det fjerne sidst", () => {
    const stops = [
      stop("fjern", 56.45, 9.5),
      stop("nær-1", 56.135, 8.995),
      stop("nær-2", 56.137, 8.997),
      stop("nær-3", 56.139, 8.999),
    ];
    const { order } = suggestOrder(stops, [56.13, 8.99], 9 * 60);
    expect(order[order.length - 1].id).toBe("fjern");
  });

  it("finder besparelse på en dårlig rækkefølge", () => {
    const stops = [
      stop("fjern-a", 56.45, 9.5),
      stop("nær-1", 56.135, 8.995),
      stop("fjern-b", 56.46, 9.52),
      stop("nær-2", 56.137, 8.997),
    ];
    const opp = findSpeedOpportunity(stops, [56.13, 8.99], 9 * 60);
    expect(opp.worth).toBe(true);
    expect(opp.savedMin).toBeGreaterThan(6);
    expect(opp.suggestedIds).toHaveLength(4);
  });

  it("melder ikke besparelse på en allerede god rækkefølge", () => {
    const stops = [
      stop("s1", 56.130, 8.990),
      stop("s2", 56.135, 8.995),
      stop("s3", 56.140, 9.000),
    ];
    const opp = findSpeedOpportunity(stops, [56.128, 8.988], 9 * 60);
    expect(opp.worth).toBe(false);
  });

  it("returnerer intet forslag ved under 3 stop", () => {
    const opp = findSpeedOpportunity([stop("a", 56.1, 9.0)], [56.13, 8.99], 9 * 60);
    expect(opp.worth).toBe(false);
  });
});
