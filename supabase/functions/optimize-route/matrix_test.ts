// Tests for den nøglefri OSRM-køretidsmatrix.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildMatrix } from "./geo.ts";
import type { LatLng } from "./types.ts";

const originalFetch = globalThis.fetch;

/** Punkter spredt langs en linje — nok til at teste flere fliser. */
const points = (n: number): LatLng[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 55.6 + i * 0.01, lng: 12.5 + i * 0.01 }));

type Capture = { urls: string[] };

function stubOsrm(opts: { fail?: boolean } = {}): Capture {
  const cap: Capture = { urls: [] };
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    cap.urls.push(url);
    if (opts.fail) return Promise.resolve(new Response("nope", { status: 422 }));

    const coordCount = new URL(url).pathname.split("/").pop()?.split(";").length ?? 0;
    const durations = Array.from({ length: coordCount }, () => new Array(coordCount).fill(600));
    const distances = Array.from({ length: coordCount }, () => new Array(coordCount).fill(8000));
    return Promise.resolve(
      new Response(JSON.stringify({ code: "Ok", durations, distances }), { status: 200 }),
    );
  }) as typeof fetch;
  return cap;
}

function restore() {
  globalThis.fetch = originalFetch;
}

Deno.test("ruter bruger den nøglefri OSRM-matrix", async () => {
  const cap = stubOsrm();
  try {
    const m = await buildMatrix(points(8));
    assert(m, "forventede en matrix");
    assertEquals(cap.urls.length, 1);
    assert(cap.urls[0].includes("router.project-osrm.org/table/v1/driving"), cap.urls[0]);
    assertEquals(m.provider, "osrm");
  } finally {
    restore();
  }
});

Deno.test("store ruter får en komplet nøglefri matrix", async () => {
  const cap = stubOsrm();
  try {
    const n = 40;
    const m = await buildMatrix(points(30));
    assert(m, "buildMatrix skal levere rigtige køretider for 30 punkter");
    assertEquals(m!.durations.length, 30);
    assertEquals(cap.urls.length, 1);
  } finally {
    restore();
  }
});

Deno.test("OSRM-fejl giver ingen matrix, så kalderen kan bruge et lokalt estimat", async () => {
  stubOsrm({ fail: true });
  try {
    const m = await buildMatrix(points(30));
    assertEquals(m, null);
  } finally {
    restore();
  }
});
