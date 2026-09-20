// Kvalitetstests for ruteoptimering med mange rigtige danske adresser.
//
// Hvor vrp_test.ts dækker enkeltmekanismer (swap, klynger, hjemtur), måler
// disse tests om den samlede rækkefølge faktisk er FORNUFTIG:
//   - ingen store zigzag (kør langt væk og tilbage igen)
//   - nærmeste stop først når man starter et bestemt sted
//   - byer besøges samlet, ikke blandet
//   - tidsvinduer overholdes
//   - resultatet er deterministisk og aldrig værre end input-rækkefølgen
//
// fetch stubbes, så vi kører på det nøglefri haversine/vej-estimat.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { solveVRP } from "./vrp.ts";
import { roadKm } from "./geo.ts";
import type { EmployeeCtx, Stop } from "./types.ts";

const realFetch = globalThis.fetch;
globalThis.fetch = (() => Promise.reject(new Error("network disabled in tests"))) as typeof fetch;
addEventListener("unload", () => {
  globalThis.fetch = realFetch;
});

function emp(id: string, lat: number, lng: number, o: Partial<EmployeeCtx> = {}): EmployeeCtx {
  return {
    id,
    name: id,
    start_lat: lat,
    start_lng: lng,
    end_lat: lat,
    end_lng: lng,
    work_start_min: 7 * 60,
    work_end_min: 17 * 60,
    ...o,
  };
}

function stop(id: string, lat: number, lng: number, opts: Partial<Stop> = {}): Stop {
  return {
    id,
    customer_name: id,
    address: id,
    latitude: lat,
    longitude: lng,
    duration_minutes: 20,
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

/** Faktiske koordinater på rigtige danske adresser. */
const PLACES: Record<string, [number, number]> = {
  // Herning-området
  herning_rema_viborgvej: [56.1448769, 8.9907360],
  herning_mcd_aavaenget: [56.1327594, 9.0072700],
  herning_bauhaus: [56.1327593, 9.0097455],
  herning_biltema: [56.1316746, 9.0102174],
  herning_centrum: [56.1360000, 8.9740000],
  herning_lidl: [56.1401000, 8.9830000],
  // Midtjylland spredt
  haderup_vistorpvej: [56.3126872, 9.0386682],
  holstebro: [56.3600000, 8.6160000],
  viborg: [56.4530000, 9.4020000],
  silkeborg: [56.1700000, 9.5500000],
  ikast: [56.1390000, 9.1540000],
  skive: [56.5670000, 9.0290000],
  // Østjylland
  aarhus_c: [56.1567000, 10.2108000],
  aarhus_n: [56.1900000, 10.1800000],
  randers: [56.4600000, 10.0360000],
};

const P = (k: keyof typeof PLACES) => PLACES[k];

/** Samlet vejafstand for en rækkefølge, inkl. ud fra og hjem til depot. */
function routeKm(depot: [number, number], order: [number, number][]): number {
  let km = 0;
  let cur = depot;
  for (const p of order) {
    km += roadKm({ lat: cur[0], lng: cur[1] }, { lat: p[0], lng: p[1] });
    cur = p;
  }
  km += roadKm({ lat: cur[0], lng: cur[1] }, { lat: depot[0], lng: depot[1] });
  return km;
}

function orderFor(plan: Map<string, { stop_id: string }[]>, empId: string): string[] {
  return (plan.get(empId) ?? []).map((s) => s.stop_id);
}

function coordsOf(ids: string[], stops: Stop[]): [number, number][] {
  const by = new Map(stops.map((s) => [s.id, s]));
  return ids.map((id) => {
    const s = by.get(id)!;
    return [s.latitude, s.longitude] as [number, number];
  });
}

Deno.test("Herning-testruten: de fire nære stop køres samlet uden zigzag", async () => {
  const depot = P("haderup_vistorpvej");
  const e = emp("e1", depot[0], depot[1]);
  const stops = [
    stop("biltema", ...P("herning_biltema")),
    stop("rema", ...P("herning_rema_viborgvej")),
    stop("mcd", ...P("herning_mcd_aavaenget")),
    stop("bauhaus", ...P("herning_bauhaus")),
  ].map((s) => ({ ...s, pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const ids = orderFor(res.plan.per_employee, "e1");
  assertEquals(ids.length, 4);

  const km = routeKm(depot, coordsOf(ids, stops));
  // Bedste mulige rundtur på disse fire punkter (brute force over 24 permutationer).
  const all = ["biltema", "rema", "mcd", "bauhaus"];
  let best = Infinity;
  const permute = (arr: string[], acc: string[] = []) => {
    if (arr.length === 0) {
      best = Math.min(best, routeKm(depot, coordsOf(acc, stops)));
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...acc, arr[i]]);
    }
  };
  permute(all);
  // Optimeringen skal ramme optimum (eller inden for 2 %).
  assert(km <= best * 1.02, `rute ${km.toFixed(1)} km vs optimum ${best.toFixed(1)} km: ${ids.join(" → ")}`);
});

Deno.test("12 stop over Midtjylland: markant bedre end en dårlig inputrækkefølge", async () => {
  const depot = P("herning_centrum");
  const e = emp("e1", depot[0], depot[1], { work_start_min: 6 * 60, work_end_min: 22 * 60 });
  // Bevidst elendig rækkefølge: hopper frem og tilbage mellem vest og øst.
  const keys: (keyof typeof PLACES)[] = [
    "aarhus_c", "holstebro", "randers", "skive", "silkeborg", "herning_lidl",
    "viborg", "herning_biltema", "aarhus_n", "ikast", "herning_bauhaus", "herning_rema_viborgvej",
  ];
  const stops = keys.map((k) => ({ ...stop(k, ...P(k), { duration_minutes: 15 }), pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const ids = orderFor(res.plan.per_employee, "e1");
  assertEquals(ids.length, keys.length);
  assertEquals(new Set(ids).size, keys.length, "ingen stop må forsvinde eller gå igen");

  const inputKm = routeKm(depot, coordsOf(keys as string[], stops));
  const optKm = routeKm(depot, coordsOf(ids, stops));
  assert(optKm < inputKm * 0.8, `forventede mindst 20 % kortere: ${optKm.toFixed(0)} vs ${inputKm.toFixed(0)} km`);

  // Herning-stoppene skal ligge i én blok (ingen af dem adskilt af en anden by).
  const herningIdx = ids
    .map((id, i) => (id.startsWith("herning_") ? i : -1))
    .filter((i) => i >= 0);
  const span = herningIdx[herningIdx.length - 1] - herningIdx[0] + 1;
  assertEquals(span, herningIdx.length, `Herning-stop skal køres samlet: ${ids.join(" → ")}`);
});

Deno.test("startposition styrer rækkefølgen: nærmeste stop først", async () => {
  // Medarbejderen står i Herning; Aarhus og Holstebro ligger hver sin vej.
  const here = P("herning_biltema");
  const e = emp("e1", here[0], here[1]);
  const stops = [
    stop("aarhus", ...P("aarhus_c"), { duration_minutes: 30 }),
    stop("bauhaus", ...P("herning_bauhaus"), { duration_minutes: 30 }),
    stop("holstebro", ...P("holstebro"), { duration_minutes: 30 }),
  ].map((s) => ({ ...s, pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const ids = orderFor(res.plan.per_employee, "e1");
  assertEquals(ids[0], "bauhaus", `nærmeste stop skal tages først, fik ${ids.join(" → ")}`);
});

Deno.test("hårde tidsvinduer overholdes selv når de bryder geografien", async () => {
  const depot = P("herning_centrum");
  const e = emp("e1", depot[0], depot[1], { work_start_min: 8 * 60, work_end_min: 18 * 60 });
  const stops = [
    // Aarhus SKAL være om formiddagen, selv om det ligger længst væk.
    stop("aarhus", ...P("aarhus_c"), { hard_start_min: 8 * 60, hard_end_min: 11 * 60, duration_minutes: 30 }),
    stop("bauhaus", ...P("herning_bauhaus"), { duration_minutes: 30 }),
    stop("biltema", ...P("herning_biltema"), { duration_minutes: 30 }),
  ].map((s) => ({ ...s, pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const plan = res.plan.per_employee.get("e1")!;
  const aarhus = plan.find((s) => s.stop_id === "aarhus")!;
  assert(aarhus.departure_min <= 11 * 60, `Aarhus skal være færdig kl. 11, blev ${aarhus.departure_min}`);
  assert(aarhus.arrival_min >= 8 * 60, "må ikke ankomme før vinduet åbner");
  assertEquals(res.plan.unassigned_stops.length, 0);
});

Deno.test("to medarbejdere: hver får sin landsdel", async () => {
  const west = emp("vest", ...P("holstebro"));
  const east = emp("oest", ...P("aarhus_c"));
  const keys: (keyof typeof PLACES)[] = [
    "aarhus_n", "herning_lidl", "randers", "herning_biltema", "skive", "silkeborg",
  ];
  const stops = keys.map((k) => stop(k, ...P(k), { duration_minutes: 30 }));

  const res = await solveVRP([west, east], stops);
  const w = orderFor(res.plan.per_employee, "vest");
  const o = orderFor(res.plan.per_employee, "oest");
  assertEquals(w.length + o.length, keys.length);
  assert(w.includes("skive"), `Skive hører til vest: vest=${w.join(",")} øst=${o.join(",")}`);
  assert(o.includes("aarhus_n"), `Aarhus N hører til øst: vest=${w.join(",")} øst=${o.join(",")}`);
  assert(w.length > 0 && o.length > 0, "begge medarbejdere skal bruges");
  // Randers kan ligge hos begge afhængigt af den samlede rundtur — men den
  // samlede løsning skal være bedre end at give én medarbejder det hele.
  const solo = await solveVRP([east], keys.map((k) => stop(k, ...P(k), { duration_minutes: 30 })));
  assert(
    res.plan.total_km < solo.plan.total_km,
    `to medarbejdere skal slå én: ${res.plan.total_km} vs ${solo.plan.total_km}`,
  );
});

Deno.test("resultatet er deterministisk uanset inputrækkefølge", async () => {
  const depot = P("herning_centrum");
  const e = emp("e1", depot[0], depot[1], { work_end_min: 22 * 60 });
  const keys: (keyof typeof PLACES)[] = [
    "viborg", "ikast", "silkeborg", "herning_lidl", "holstebro", "skive", "herning_biltema",
  ];
  const mk = (order: (keyof typeof PLACES)[]) =>
    order.map((k) => ({ ...stop(k, ...P(k), { duration_minutes: 15 }), pinned_assignees: ["e1"] }));

  const a = await solveVRP([e], mk(keys));
  const b = await solveVRP([e], mk([...keys].reverse()));
  assertEquals(orderFor(a.plan.per_employee, "e1"), orderFor(b.plan.per_employee, "e1"));
  assertEquals(a.plan.total_km, b.plan.total_km);
});

Deno.test("ankomsttider stiger monotont og passer med køretid", async () => {
  const depot = P("herning_centrum");
  const e = emp("e1", depot[0], depot[1], { work_end_min: 22 * 60 });
  const keys: (keyof typeof PLACES)[] = ["ikast", "silkeborg", "viborg", "herning_lidl", "holstebro"];
  const stops = keys.map((k) => ({ ...stop(k, ...P(k), { duration_minutes: 45 }), pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const plan = res.plan.per_employee.get("e1")!;
  for (let i = 0; i < plan.length; i++) {
    assert(plan[i].departure_min > plan[i].arrival_min, "afgang skal ligge efter ankomst");
    if (i > 0) {
      assert(
        plan[i].arrival_min >= plan[i - 1].departure_min,
        `stop ${i} ankommer før forrige er færdigt`,
      );
    }
  }
  assert(res.plan.total_minutes > 0);
  assert(res.plan.total_km > 0);
});

Deno.test("mange stop på samme adresse køres i træk", async () => {
  const depot = P("herning_centrum");
  const e = emp("e1", depot[0], depot[1], { work_end_min: 22 * 60 });
  const [lat, lng] = P("aarhus_c");
  const stops = [
    stop("ikast", ...P("ikast")),
    stop("tower_1", lat, lng, { cluster_key: "tower" }),
    stop("silkeborg", ...P("silkeborg")),
    stop("tower_2", lat, lng, { cluster_key: "tower" }),
    stop("holstebro", ...P("holstebro")),
    stop("tower_3", lat, lng, { cluster_key: "tower" }),
  ].map((s) => ({ ...s, pinned_assignees: ["e1"] }));

  const res = await solveVRP([e], stops);
  const ids = orderFor(res.plan.per_employee, "e1");
  const idx = ids.map((id, i) => (id.startsWith("tower_") ? i : -1)).filter((i) => i >= 0);
  assertEquals(idx.length, 3);
  assertEquals(idx[2] - idx[0], 2, `samme adresse skal køres samlet: ${ids.join(" → ")}`);
});
