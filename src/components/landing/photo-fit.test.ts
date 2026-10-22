import { describe, expect, it } from "vitest";
import { containPhotoScale } from "./photo-fit";

describe("complete hero photos", () => {
  it("keeps the full 4:3 photo inside a 3:2 mobile frame", () => {
    expect(containPhotoScale(3 / 2, 4 / 3)).toEqual([1.125, 1]);
  });
  it("keeps the full wide photo without flattening it", () => {
    expect(containPhotoScale(3 / 2, 16 / 9)).toEqual([1, 32 / 27]);
  });
});