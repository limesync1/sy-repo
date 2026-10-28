export type PhotoPhase = "before" | "after";
export const PHASE_LABEL: Record<PhotoPhase, string> = { before: "Før", after: "Efter" };
export const MAX_PER_PHASE = 3;

/** Foreslår "Før", indtil der er et før-billede eller arbejdet er udført; derefter "Efter". */
export function suggestPhase(photos: Array<{ phase: string }>, completed: boolean): PhotoPhase {
  if (completed) return "after";
  return photos.some((p) => p.phase === "before") ? "after" : "before";
}
