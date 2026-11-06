import { describe, expect, it } from "vitest";
import { imageCoverScale, imageFitScale, originalImageUrl, rotatedFitScale, visibleImageBounds } from "./profile-image-source";

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
  it("starts a square photo edge to edge instead of adding a white border", () => {
    expect(imageCoverScale(400, 400, 280)).toBe(0.7);
  });
  it("fills the crop with a landscape photo", () => {
    expect(imageCoverScale(800, 400, 280)).toBe(0.7);
  });
  it("keeps a rotated image covering every corner", () => {
    expect(imageCoverScale(400, 400, 280, 45)).toBeCloseTo(0.7 * Math.SQRT2);
    expect(imageCoverScale(800, 400, 280, 90)).toBeCloseTo(0.7);
  });
  it("shows all of a rotated rectangular original when requested", () => {
    expect(rotatedFitScale(800, 400, 280, false, 45)).toBeCloseTo(280 / (1200 / Math.SQRT2));
  });
  it("excludes transparent padding but retains white artwork", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    pixels.set([255, 255, 255, 255], (1 * 4 + 1) * 4);
    pixels.set([0, 100, 200, 255], (2 * 4 + 2) * 4);
    expect(visibleImageBounds(pixels, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });
});