import { beforeEach, describe, expect, it } from "vitest";
import { enqueueCompletion, flushQueue, readQueue } from "./offline-stop-queue";

describe("offline stop queue", () => {
  beforeEach(() => localStorage.clear());
  it("keeps one entry per stop and sends them when back online", async () => {
    enqueueCompletion({ stopId: "a", completedAt: "x" });
    enqueueCompletion({ stopId: "a", completedAt: "y" });
    enqueueCompletion({ stopId: "b", completedAt: "z" });
    expect(readQueue()).toHaveLength(2);
    const sent: string[] = [];
    expect(await flushQueue(async (q) => { sent.push(q.stopId); })).toBe(2);
    expect(sent).toEqual(["a", "b"]);
    expect(readQueue()).toEqual([]);
  });
  it("stops and keeps items on network failure", async () => {
    enqueueCompletion({ stopId: "a", completedAt: "x" });
    await flushQueue(async () => { throw new Error("Failed to fetch"); });
    expect(readQueue()).toHaveLength(1);
  });
});
