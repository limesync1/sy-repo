import { describe, expect, it } from "vitest";
import { imageFitScale, originalImageUrl } from "./profile-image-source";

describe("original profile images", () => {
  it("reopens the uncropped source after saving a crop", () => {
    expect(originalImageUrl("https://example.test/assets/user/logo/crop-abc.webp")).toBe("https://example.test/assets/user/logo/original-abc.webp");
  });
  it("does not claim a legacy crop has an original", () => {
    expect(originalImageUrl("https://example.test/assets/avatar-123.webp")).toBeNull();
  });
  it("fits all corners of a square inside a circular avatar", () => {
    expect(imageFitScale(400, 400, 280, true) * Math.hypot(400, 400)).toBeCloseTo(280);
  });
  it("fits a wide logo inside the square without clipping", () => {
    expect(imageFitScale(800, 400, 280, false)).toBe(0.35);
  });
});