import { describe, it, expect, vi } from "vitest";
import { MutationQueue } from "./mutation-queue";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("MutationQueue", () => {
  it("runs tasks strictly serially in FIFO order", async () => {
    const q = new MutationQueue();
    const log: string[] = [];
    let inflight = 0;
    let maxInflight = 0;

    const make = (label: string, ms: number) =>
      q.run(async () => {
        inflight++;
        maxInflight = Math.max(maxInflight, inflight);
        log.push(`start:${label}`);
        await wait(ms);
        log.push(`end:${label}`);
        inflight--;
        return label;
      });

    const results = await Promise.all([
      make("a", 30),
      make("b", 10),
      make("c", 5),
    ]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(maxInflight).toBe(1);
    expect(log).toEqual([
      "start:a", "end:a",
      "start:b", "end:b",
      "start:c", "end:c",
    ]);
  });

  it("isolates errors per task — a failing task does not stop the queue", async () => {
    const q = new MutationQueue();
    const ok1 = q.run(async () => "ok1");
    const bad = q.run(async () => { throw new Error("boom"); });
    const ok2 = q.run(async () => "ok2");

    await expect(ok1).resolves.toBe("ok1");
    await expect(bad).rejects.toThrow("boom");
    await expect(ok2).resolves.toBe("ok2");
  });

  it("simulates fast move + delete interleaving with no overlap", async () => {
    // In-memory store of route stops keyed by id.
    const store = new Map<string, { id: string; sequence: number; routeId: string }>();
    for (let i = 0; i < 5; i++) {
      store.set(`s${i}`, { id: `s${i}`, sequence: i, routeId: "R1" });
    }
    const q = new MutationQueue();

    // Simulate slow DB operations + interleaved deletes from the user.
    const moveOp = (id: string, newSeq: number) =>
      q.run(async () => {
        await wait(5 + Math.random() * 10);
        const existing = store.get(id);
        if (!existing) throw new Error("ghost");
        store.set(id, { ...existing, sequence: newSeq });
      });
    const deleteOp = (id: string) =>
      q.run(async () => {
        await wait(5 + Math.random() * 10);
        store.delete(id);
      });

    // Fire 30 ops of various kinds without awaiting — like a frantic user.
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 30; i++) {
      const id = `s${i % 5}`;
      if (i === 7) promises.push(deleteOp("s2"));
      else if (i === 18) promises.push(deleteOp("s4"));
      else promises.push(moveOp(id, (i * 7) % 11).catch(() => null));
    }
    const settled = await Promise.allSettled(promises);

    // Final state: deleted stops must be gone; remaining stops must each
    // exist exactly once (no duplicates / no ghosts).
    expect(store.has("s2")).toBe(false);
    expect(store.has("s4")).toBe(false);
    expect(store.has("s0")).toBe(true);
    expect(store.has("s1")).toBe(true);
    expect(store.has("s3")).toBe(true);
    // No throws apart from the expected "ghost" rejections after the deletes.
    const unexpectedRejections = settled.filter(
      (r) => r.status === "rejected" && (r as any).reason?.message !== "ghost",
    );
    expect(unexpectedRejections).toEqual([]);
  });

  it("clearPending rejects waiting tasks but lets the running one finish", async () => {
    const q = new MutationQueue();
    const slow = q.run(async () => { await wait(20); return "done"; });
    const skipped = q.run(async () => "never");
    // Catch immediately so the rejection isn't classified as unhandled.
    const skippedSettled = skipped.catch((e) => e);
    q.clearPending();
    await expect(slow).resolves.toBe("done");
    const reason = await skippedSettled;
    expect(reason).toBeInstanceOf(Error);
    expect((reason as Error).message).toBe("queue cleared");
  });

  it("tracks pending count correctly", async () => {
    const q = new MutationQueue();
    const p1 = q.run(async () => { await wait(10); });
    const p2 = q.run(async () => { await wait(10); });
    const p3 = q.run(async () => { await wait(10); });
    // p1 starts immediately, p2/p3 wait
    expect(q.pending).toBe(2);
    await Promise.all([p1, p2, p3]);
    expect(q.pending).toBe(0);
  });
});