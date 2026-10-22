import { describe, expect, it } from "vitest";
import photos from "./hero-photo-data.json";

describe("stable hero format", () => {
  it("keeps all five photos at 4:3 so the frame never changes size", () => {
    expect(photos).toHaveLength(5);
    for (const photo of photos) expect(photo.width / photo.height).toBe(4 / 3);
  });
});