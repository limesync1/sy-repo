// toast-batch — saml bursts af toast-events i en enkelt opsummerings-toast.
//
// Eksempel: ved bulk-flytning af 12 ruter ville hver mutation normalt poppe
// sin egen sonner-toast. I stedet kalder call-site `pushBatchedToast` for
// hver succes/fejl, og første call åbner et 300ms vindue. Når vinduet
// lukker, vises én konsolideret toast ("12 ruter flyttet" eller "10 ok · 2 fejl").
import { toast } from "sonner";

type Entry = { kind: "success" | "error"; label: string };

type Batch = {
  entries: Entry[];
  timer: ReturnType<typeof setTimeout> | null;
  successWord: string;
  errorWord: string;
  windowMs: number;
};

const batches = new Map<string, Batch>();

function flush(key: string) {
  const b = batches.get(key);
  if (!b) return;
  batches.delete(key);
  const ok = b.entries.filter((e) => e.kind === "success").length;
  const err = b.entries.filter((e) => e.kind === "error").length;
  const total = ok + err;
  if (total === 0) return;
  if (total === 1) {
    const only = b.entries[0];
    if (only.kind === "success") toast.success(only.label);
    else toast.error(only.label);
    return;
  }
  if (err === 0) {
    toast.success(`${ok} ${b.successWord}`);
  } else if (ok === 0) {
    toast.error(`${err} ${b.errorWord}`);
  } else {
    toast.message(`${ok} ${b.successWord} · ${err} ${b.errorWord}`);
  }
}

export type BatchOpts = {
  /** Stabil id der grupperer toasts, fx "move-routes". */
  key: string;
  successWord?: string; // fx "ruter flyttet"
  errorWord?: string;   // fx "fejlede"
  /** Hvor længe vi venter på flere events før vi viser én toast. */
  windowMs?: number;
};

/** Tilføj en hændelse til en batch — første call åbner et tidsvindue. */
export function pushBatchedToast(
  kind: "success" | "error",
  label: string,
  opts: BatchOpts,
) {
  const existing = batches.get(opts.key);
  if (existing) {
    existing.entries.push({ kind, label });
    return;
  }
  const b: Batch = {
    entries: [{ kind, label }],
    timer: null,
    successWord: opts.successWord ?? "handlinger udført",
    errorWord: opts.errorWord ?? "handlinger fejlede",
    windowMs: opts.windowMs ?? 300,
  };
  batches.set(opts.key, b);
  b.timer = setTimeout(() => flush(opts.key), b.windowMs);
}

/** Tving en batch til at vise sin opsummering nu (fx ved afslutning af loop). */
export function flushBatchedToast(key: string) {
  const b = batches.get(key);
  if (b?.timer) clearTimeout(b.timer);
  flush(key);
}