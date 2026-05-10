/**
 * Serial mutation queue.
 *
 * Guarantees that async tasks enqueued via `run` execute strictly one at a
 * time, in FIFO order. Used to serialize drag-and-drop mutations on the
 * route planner so two rapid drops cannot race against each other and leave
 * the database in an inconsistent state (overlapping bookings, ghost stops,
 * lost reorderings, etc.).
 *
 * Each task gets its own `Promise` that resolves/rejects with the task's own
 * outcome — a failure in one task does NOT cancel the rest of the queue.
 */

type Task<T> = {
  fn: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

export class MutationQueue {
  private q: Task<unknown>[] = [];
  private running = false;

  /** Number of tasks currently waiting (excluding the running one). */
  get pending(): number {
    return this.q.length;
  }

  get isRunning(): boolean {
    return this.running;
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.q.push({ fn, resolve, reject } as Task<unknown>);
      void this.drain();
    });
  }

  /** Drop everything that hasn't started yet. The running task still finishes. */
  clearPending(): void {
    const dropped = this.q.splice(0, this.q.length);
    for (const t of dropped) {
      t.reject(new Error("queue cleared"));
    }
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.q.length > 0) {
        const task = this.q.shift()!;
        try {
          const result = await task.fn();
          task.resolve(result);
        } catch (e) {
          task.reject(e);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

/** Module-level singleton — most code only needs one queue. */
export const routeMutationQueue = new MutationQueue();