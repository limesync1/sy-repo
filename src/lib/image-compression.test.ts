import { describe, expect, it } from "vitest";
import { compressedImageSize } from "./image-compression";

describe("image compression dimensions", () => {
  it("bounds a large phone photo before editing", () => {
    expect(compressedImageSize(6000, 4000, 2400)).toEqual({ width: 2400, height: 1600 });
  });
  it("bounds a portrait without changing its aspect ratio", () => {
    expect(compressedImageSize(3000, 6000, 1600)).toEqual({ width: 800, height: 1600 });
  });
  it("does not upscale a small logo", () => {
    expect(compressedImageSize(320, 240, 1600)).toEqual({ width: 320, height: 240 });
  });
});