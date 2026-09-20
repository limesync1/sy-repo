// Regressionstests for ruteoptimering.
//
// Dækker tre scenarier som tidligere har givet brudt feedback:
//   1) Inter-employee swap ("fletteflyt") — stops bør havne hos den
//      medarbejder de geografisk hører til.
//   2) Samme adresse-klyngning — flere stops på samme cluster_key skal
//      altid køres lige efter hinanden.
//   3) "Ingen forbedring fundet" — en allerede optimal rute skal
//      returnere samme rækkefølge og ~0 km/min besparelse.
//
// For at testen er hurtig og deterministisk stubber vi global fetch,
// så OSRM-matrix returnerer null og solveVRP falder tilbage til
// haversine-estimater.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { solveVRP } from "./vrp.ts";
import type { EmployeeCtx, Stop } from "./types.ts";

// --- fetch-stub: tvinger haversine-fallback (ingen netværk) ---
const realFetch = globalThis.fetch;
globalThis.fetch = (() => Promise.reject(new Error("network disabled in tests"))) as typeof fetch;
addEventListener("unload", () => {
  globalThis.fetch = realFetch;
});

function emp(id: string, lat: number, lng: number): EmployeeCtx {
  return {
    id,
    name: id,
    start_lat: lat,
    start_lng: lng,
    end_lat: lat,
    end_lng: lng,
    work_start_min: 8 * 60,
    work_end_min: 18 * 60,
  };
}

function stop(
  id: string,
  lat: number,
  lng: number,
  opts: Partial<Stop> = {},
): Stop {
  return {
    id,
    customer_name: id,
    address: id,
    latitude: lat,
    longitude: lng,
    duration_minutes: 30,
    preferred_start_min: null,
    preferred_end_min: null,
    hard_start_min: null,
    hard_end_min: null,
    required_staff: 1,
    pinned_assignees: [],
    cluster_key: null,
    ...opts,
  };
}

function orderFor(plan: Map<string, { stop_id: string }[]>, empId: string): string[] {
  return (plan.get(empId) ?? []).map((s) => s.stop_id);
}

Deno.test("inter-employee swap: stops havner hos nærmeste medarbejder", async () => {
  // empA bor langt mod vest, empB langt mod øst. To stops, ét tæt på hver.
  // Input-rækkefølgen ville få greedy til at putte begge stops hos empA hvis
  // den ikke kørte inter-employee swap bagefter.
  const employees = [emp("A", 55.0, 12.0), emp("B", 55.0, 13.0)];
  const stops = [
    stop("near-A", 55.0, 12.01),
    stop("near-B", 55.0, 12.99),
  ];

  const { plan } = await solveVRP(employees, stops);

  const a = orderFor(plan.per_employee, "A");
  const b = orderFor(plan.per_employee, "B");
  assertEquals(a, ["near-A"], "stop tæt på A skal være hos A");
  assertEquals(b, ["near-B"], "stop tæt på B skal være hos B");
  assertEquals(plan.unassigned_stops.length, 0);
});

Deno.test("samme adresse-klyngning: stops med samme cluster_key kørt samlet", async () => {
  // 3 stops på samme adresse + 1 stop på anden adresse indsat midt i listen.
  // Optimeringen SKAL holde de 3 adresse-aftaler sammen i en blok.
  const employees = [emp("E", 55.6761, 12.5683)];
  const stops = [
    stop("addr-a-1", 55.70, 12.55, { cluster_key: "addr-a" }),
    stop("addr-b-1", 55.72, 12.60, { cluster_key: "addr-b" }),
    stop("addr-a-2", 55.70, 12.5501, { cluster_key: "addr-a" }),
    stop("addr-a-3", 55.70, 12.5502, { cluster_key: "addr-a" }),
  ];

  const { plan } = await solveVRP(employees, stops);
  const seq = orderFor(plan.per_employee, "E");

  // Find indeks for addr-a stops; de skal være kontinuerte.
  const aIdx = seq
    .map((id, i) => ({ id, i }))
    .filter((x) => x.id.startsWith("addr-a"))
    .map((x) => x.i);
  assertEquals(aIdx.length, 3, "alle 3 addr-a stops skal være planlagt");
  const contiguous = aIdx[2] - aIdx[0] === 2;
  assert(
    contiguous,
    `addr-a stops skal være sammenhængende — fik indekser ${aIdx.join(",")} i rækkefølge ${seq.join(",")}`,
  );
});

Deno.test("ingen forbedring fundet: optimal input giver samme rækkefølge", async () => {
  // En allerede ideel sekvens: stops i lige linje øst fra medarbejderens base.
  const employees = [emp("E", 55.0, 12.0)];
  const stops = [
    stop("s1", 55.0, 12.01),
    stop("s2", 55.0, 12.02),
    stop("s3", 55.0, 12.03),
    stop("s4", 55.0, 12.04),
  ];

  const { plan, current } = await solveVRP(employees, stops);
  const seq = orderFor(plan.per_employee, "E");

  // current.stop_order = input-rækkefølgen brugeren ser
  assertEquals(current.stop_order, ["s1", "s2", "s3", "s4"]);
  assert(current.feasible, "baseline skal være feasible");
  // Optimeret rækkefølge er enten identisk eller en perfekt reversering
  // (samme cost) — begge dele skal rapporteres som "ingen forbedring".
  const reversed = ["s4", "s3", "s2", "s1"];
  const sameOrder = seq.join("|") === current.stop_order.join("|");
  const reversedOrder = seq.join("|") === reversed.join("|");
  assert(
    sameOrder || reversedOrder,
    `forventet samme eller spejlet rækkefølge — fik ${seq.join(",")}`,
  );

  // Total km skal være ~lig baseline (tolerance for afrunding)
  const delta = Math.abs(plan.total_km - current.total_km);
  assert(delta < 0.01, `total_km skal matche baseline — diff ${delta}`);
});

Deno.test("ingen medarbejdere tilknyttet stops giver tom plan", async () => {
  // Edge function bruger en "virtual employee" i dette tilfælde; rent på
  // VRP-niveau betyder ingen medarbejdere = unassigned stops (men ingen crash).
  const { plan } = await solveVRP([], [stop("orphan", 55.0, 12.0)]);
  assertEquals(plan.unassigned_stops, ["orphan"]);
  assertEquals(plan.total_km, 0);
});

Deno.test("samlet køretid medregner hjemturen", async () => {
  const employees = [emp("E", 55.0, 12.0)];
  const stops = [stop("langt-væk", 55.0, 12.1, { duration_minutes: 30 })];

  const { plan } = await solveVRP(employees, stops);

  // Ca. 6,4 km hver vej ved fallbackens 50 km/t er ca. 15 min kørsel i alt.
  // Med service skal totalen derfor tydeligt overstige 30 minutter.
  assert(plan.total_minutes >= 44, `forventede service + ud- og hjemtur, fik ${plan.total_minutes} min`);
});