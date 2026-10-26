import { describe, expect, it, vi } from "vitest";
import { addStopsInOrder } from "./add-stops-batch";

describe("ordered route creation", () => {
  it("keeps selected order and waits for each persisted stop", async () => {
    const calls: string[] = [];
    let active = 0;
    const progress = vi.fn();
    const result = await addStopsInOrder(["a", "b", "c"], async (id, index) => {
      expect(active).toBe(0);
      active++;
      await Promise.resolve();
      calls.push(`${id}:${index}`);
      active--;
    }, progress);
    expect(calls).toEqual(["a:0", "b:1", "c:2"]);
    expect(result.saved).toEqual(["a", "b", "c"]);
    expect(result.failed).toEqual([]);
    expect(progress.mock.calls).toEqual([[1], [2], [3]]);
  });
  it("reports only persisted successes and keeps failures available for retry", async () => {
    const result = await addStopsInOrder(["a", "b", "c"], async id => {
      if (id === "b") throw new Error("Connection lost");
    });
    expect(result.saved).toEqual(["a", "c"]);
    expect(result.failed).toEqual([{ item: "b", index: 1, error: expect.any(Error) }]);
    const retry = vi.fn().mockResolvedValue(undefined);
    await addStopsInOrder(result.failed.map(f => f.item), retry);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith("b", 0);
  });
});