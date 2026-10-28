import { describe, expect, it } from "vitest";
import { extractAccessHints } from "./stop-access-notes";

describe("extractAccessHints", () => {
  it("finds code, dog and parking", () => {
    const h = extractAccessHints("Portkode: 1234. Hund i haven! Parkér ved bagsiden.");
    expect(h.map((x) => x.kind)).toEqual(["code", "pet", "parking"]);
  });
  it("ignores notes without access info", () => {
    expect(extractAccessHints("Husk vinduerne på 1. sal")).toEqual([]);
  });
});
