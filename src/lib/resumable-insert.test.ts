import { describe, expect, it, vi } from "vitest";
import { createInsertStage, resumeInsert } from "./resumable-insert";

describe("resumable inserts", () => {
  it("uses one write and no lookup on the successful first attempt", async () => {
    const rows = [{ id: "order-1", amount: 600 }];
    const stage = createInsertStage(rows);
    const store = { existingIds: vi.fn(), insert: vi.fn().mockResolvedValue(undefined) };
    await resumeInsert(stage, store);
    expect(store.insert).toHaveBeenCalledExactlyOnceWith(rows);
    expect(store.existingIds).not.toHaveBeenCalled();
    expect(stage.complete).toBe(true);
  });

  it("does not repeat a write that committed before its response was lost", async () => {
    const stage = createInsertStage([{ id: "order-1" }]);
    const store = {
      existingIds: vi.fn().mockResolvedValue(["order-1"]),
      insert: vi.fn().mockRejectedValue(new Error("Lost response")),
    };
    await expect(resumeInsert(stage, store)).rejects.toThrow("Lost response");
    await resumeInsert(stage, store);
    expect(store.insert).toHaveBeenCalledTimes(1);
    expect(stage.complete).toBe(true);
  });

  it("retries only missing rows using their original IDs and values", async () => {
    const rows = [{ id: "item-1", total: 600 }, { id: "item-2", total: 250 }];
    const stage = createInsertStage(rows);
    const store = {
      existingIds: vi.fn().mockResolvedValue(["item-1"]),
      insert: vi.fn().mockRejectedValueOnce(new Error("Failed")).mockResolvedValue(undefined),
    };
    await expect(resumeInsert(stage, store)).rejects.toThrow("Failed");
    await resumeInsert(stage, store);
    expect(store.insert).toHaveBeenLastCalledWith([rows[1]]);
    expect(stage.complete).toBe(true);
  });

  it("never inserts when reconciliation fails", async () => {
    const stage = createInsertStage([{ id: "order-1" }]);
    stage.attempted = true;
    const store = { existingIds: vi.fn().mockRejectedValue(new Error("Offline")), insert: vi.fn() };
    await expect(resumeInsert(stage, store)).rejects.toThrow("Offline");
    expect(store.insert).not.toHaveBeenCalled();
    expect(stage.complete).toBe(false);
  });

  it("skips the saved parent stage when the item stage needs retry", async () => {
    const parent = createInsertStage([{ id: "order-1" }]);
    const items = createInsertStage([{ id: "item-1" }]);
    const parentStore = { existingIds: vi.fn(), insert: vi.fn().mockResolvedValue(undefined) };
    const itemStore = { existingIds: vi.fn().mockResolvedValue([]), insert: vi.fn().mockRejectedValueOnce(new Error("Failed")).mockResolvedValue(undefined) };
    await resumeInsert(parent, parentStore);
    await expect(resumeInsert(items, itemStore)).rejects.toThrow("Failed");
    await resumeInsert(parent, parentStore);
    await resumeInsert(items, itemStore);
    expect(parentStore.insert).toHaveBeenCalledTimes(1);
    expect(itemStore.insert).toHaveBeenCalledTimes(2);
  });
});