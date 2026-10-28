import { describe, it, expect } from "vitest";
import { photoErrorMessage, thumbPathFor, validatePhotoFile } from "./stop-photo-upload";

describe("stop photo upload helpers", () => {
  it("lægger miniaturen ved siden af originalen", () => {
    expect(thumbPathFor("b/s/abc.jpg")).toBe("b/s/abc_t.jpg");
  });
  it("afviser filer der ikke er billeder", () => {
    expect(validatePhotoFile({ type: "application/pdf", size: 10 })).not.toBeNull();
    expect(validatePhotoFile({ type: "image/jpeg", size: 10 })).toBeNull();
  });
  it("forklarer adgangsfejl", () => {
    expect(photoErrorMessage(new Error("new row violates row-level security"))).toMatch(/adgang/);
  });
});
