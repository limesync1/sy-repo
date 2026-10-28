// Kø af "Markér udført", der ikke kunne sendes pga. manglende dækning.
// Gemmes på telefonen og sendes automatisk, når forbindelsen er tilbage.
export type QueuedCompletion = { stopId: string; completedAt: string; notes?: string; employeeId?: string | null };

const KEY = "offline-stop-completions";

export function readQueue(): QueuedCompletion[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(q: QueuedCompletion[]) {
  try { if (q.length) localStorage.setItem(KEY, JSON.stringify(q)); else localStorage.removeItem(KEY); } catch { /* blokeret lager */ }
}
export function enqueueCompletion(item: QueuedCompletion) {
  write([...readQueue().filter((q) => q.stopId !== item.stopId), item]);
}
export function removeFromQueue(stopId: string) {
  write(readQueue().filter((q) => q.stopId !== stopId));
}
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String((e as any)?.message || e || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed");
}

/** Sender køen. Returnerer antal sendte. Stop der fejler af andre grunde end net fjernes ikke. */
export async function flushQueue(send: (q: QueuedCompletion) => Promise<void>): Promise<number> {
  let sent = 0;
  for (const item of readQueue()) {
    try { await send(item); removeFromQueue(item.stopId); sent++; }
    catch (e) { if (isNetworkError(e)) break; }
  }
  return sent;
}
