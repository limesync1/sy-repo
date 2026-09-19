// Tests for køretidsmatrixen. Vi stubber fetch, så vi kan verificere at vi
// aldrig sender flere koordinater til Mapbox end profilen tillader, og at
// store ruter faktisk får rigtige køretider (i fliser) i stedet for fugleflugt.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildMatrix, mapboxMatrix, mapboxMatrixTiled } from "./geo.ts";
import type { LatLng } from "./types.ts";

const originalFetch = globalThis.fetch;

/** Punkter spredt langs en linje — nok til at teste flere fliser. */
const points = (n: number): LatLng[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 55.6 + i * 0.01, lng: 12.5 + i * 0.01 }));

type Capture = { urls: string[] };

function stubMapbox(opts: { fail?: boolean } = {}): Capture {
  const cap: Capture = { urls: [] };
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    cap.urls.push(url);
    if (opts.fail) return Promise.resolve(new Response("nope", { status: 422 }));

    // Antal kilder/mål udledes af query-parametrene.
    const u = new URL(url);
    const coordCount = u.pathname.split("/").pop()!.split(";").length;
    const srcCount = u.searchParams.get("sources")?.split(";").length ?? coordCount;
    const dstCount = u.searchParams.get("destinations")?.split(";").length ?? coordCount;
    const durations = Array.from({ length: srcCount }, () => new Array(dstCount).fill(600));
    const distances = Array.from({ length: srcCount }, () => new Array(dstCount).fill(8000));
    return Promise.resolve(
      new Response(JSON.stringify({ durations, distances }), { status: 200 }),
    );
  }) as typeof fetch;
  return cap;
}

function restore() {
  globalThis.fetch = originalFetch;
}

Deno.env.set("MAPBOX_ACCESS_TOKEN", "test-token");

Deno.test("små ruter bruger driving-traffic (live trafik)", async () => {
  const cap = stubMapbox();
  try {
    const m = await mapboxMatrix(points(8));
    assert(m, "forventede en matrix");
    assertEquals(cap.urls.length, 1);
    assert(cap.urls[0].includes("/driving-traffic/"), cap.urls[0]);
  } finally {
    restore();
  }
});

Deno.test("11–25 punkter skifter til driving-profilen (traffic tillader kun 10)", async () => {
  const cap = stubMapbox();
  try {
    const m = await mapboxMatrix(points(20));
    assert(m, "forventede en matrix");
    assert(!cap.urls[0].includes("driving-traffic"), cap.urls[0]);
    assert(cap.urls[0].includes("/driving/"), cap.urls[0]);
  } finally {
    restore();
  }
});

Deno.test("store ruter hentes i fliser med maks 24 koordinater pr. kald", async () => {
  const cap = stubMapbox();
  try {
    const n = 40;
    const m = await mapboxMatrixTiled(points(n));
    assert(m, "forventede en flise-matrix");
    assertEquals(m!.durations.length, n);
    assertEquals(m!.durations[0].length, n);
    assertEquals(m!.provider, "mapbox");
    for (const url of cap.urls) {
      const coordCount = new URL(url).pathname.split("/").pop()!.split(";").length;
      assert(coordCount <= 25, `for mange koordinater i ét kald: ${coordCount}`);
    }
    // Ingen felter må mangle — huller udfyldes med fugleflugt.
    for (const row of m!.durations) {
      for (const v of row) assert(Number.isFinite(v), "matrix havde et hul");
    }
    // Diagonalen skal være nul.
    for (let i = 0; i < n; i++) assertEquals(m!.durations[i][i], 0);
  } finally {
    restore();
  }
});

Deno.test("buildMatrix bruger fliser over 25 punkter i stedet for at give op", async () => {
  stubMapbox();
  try {
    const m = await buildMatrix(points(30));
    assert(m, "buildMatrix skal levere rigtige køretider for 30 punkter");
    assertEquals(m!.durations.length, 30);
  } finally {
    restore();
  }
});

Deno.test("alle kald fejler → ingen matrix (kalderen falder til fugleflugt)", async () => {
  stubMapbox({ fail: true });
  try {
    const m = await mapboxMatrixTiled(points(30));
    assertEquals(m, null);
  } finally {
    restore();
  }
});
