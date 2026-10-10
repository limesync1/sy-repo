import { describe, it, expect, beforeEach } from "vitest";
import { googleMapsPreviouslyFailed, rememberGoogleMapsFailure } from "./google-maps-loader";

describe("google maps fallback memory", () => {
  beforeEach(() => sessionStorage.clear());
  it("remembers and clears a failure for the session", () => {
    expect(googleMapsPreviouslyFailed()).toBe(false);
    rememberGoogleMapsFailure(true);
    expect(googleMapsPreviouslyFailed()).toBe(true);
    rememberGoogleMapsFailure(false);
    expect(googleMapsPreviouslyFailed()).toBe(false);
  });
});
