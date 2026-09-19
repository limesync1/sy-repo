// Tests for køretidsmatrixen. Vi stubber fetch, så vi kan verificere at vi
// aldrig sender flere koordinater til Mapbox end profilen tillader, og at
// store ruter faktisk får rigtige køretider (i fliser) i stedet for fugleflugt.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildMatrix, mapboxMatrix, mapboxMatrixTiled } from "./vrp.ts" with { type: "macro" };
