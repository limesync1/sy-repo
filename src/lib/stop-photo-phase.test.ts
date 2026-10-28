import { describe, expect, it } from "vitest";
import { suggestPhase } from "./stop-photo-phase";

describe("suggestPhase", () => {
  it("suggests before when no before photo yet", () => expect(suggestPhase([], false)).toBe("before"));
  it("suggests after once a before photo exists", () => expect(suggestPhase([{ phase: "before" }], false)).toBe("after"));
  it("suggests after when the stop is done", () => expect(suggestPhase([], true)).toBe("after"));
});
