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
  retries: number;
  backoffMs: number;
  shouldRetry: (err: unknown, attempt: number) => boolean;
};

export type RunOptions = {
  /** Total attempts incl. the first. Default 1 (no retry). */
  retries?: number;
  /** Base backoff in ms, doubled per attempt. Default 250. */
  backoffMs?: number;
  /** Decide if a thrown error is retryable. Default: network/5xx/timeout. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
};

/** Heuristic: retry network / Supabase 5xx / abort / timeout. */
const defaultShouldRetry = (err: unknown): boolean => {
  const msg = (err as any)?.message?.toLowerCase?.() ?? "";
  const code = (err as any)?.code;
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  if (status && status >= 500 && status < 600) return true;
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED") return true;
  return /network|failed to fetch|timeout|fetcherror|temporarily|503|504/.test(msg);
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

  run<T>(fn: () => Promise<T>, opts: RunOptions = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.q.push({
        fn,
        resolve,
        reject,
        // Default: retry transient failures twice (3 attempts total) — covers
        // flaky network / Supabase cold-starts under drag-and-drop load.
        retries: Math.max(1, opts.retries ?? 3),
        backoffMs: opts.backoffMs ?? 250,
        shouldRetry: opts.shouldRetry ?? defaultShouldRetry,
      } as Task<unknown>);
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
        let lastErr: unknown;
        let succeeded = false;
        for (let attempt = 1; attempt <= task.retries; attempt++) {
          try {
            const result = await task.fn();
            task.resolve(result);
            succeeded = true;
            break;
          } catch (e) {
            lastErr = e;
            if (attempt >= task.retries || !task.shouldRetry(e, attempt)) break;
            const wait = task.backoffMs * 2 ** (attempt - 1);
            await new Promise((r) => setTimeout(r, wait));
          }
        }
        if (!succeeded) task.reject(lastErr);
      }
    } finally {
      this.running = false;
    }
  }
}

/** Module-level singleton — most code only needs one queue. */
export const routeMutationQueue = new MutationQueue();