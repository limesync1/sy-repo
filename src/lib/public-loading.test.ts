import { expect, it } from "vitest";
import { canPreloadPublicPages } from "./public-loading";
it("does not prefetch public pages when the user requests data saving", () => {
  expect(canPreloadPublicPages({ saveData: true, effectiveType: "4g" })).toBe(false);
});
it("does not compete with visible content on 2G", () => {
  expect(canPreloadPublicPages({ effectiveType: "2g" })).toBe(false);
  expect(canPreloadPublicPages({ effectiveType: "slow-2g" })).toBe(false);
  expect(canPreloadPublicPages({ effectiveType: "4g" })).toBe(true);
});
it("keeps 3G bandwidth available for the current page", () => {
  expect(canPreloadPublicPages({ effectiveType: "3g" })).toBe(false);
});