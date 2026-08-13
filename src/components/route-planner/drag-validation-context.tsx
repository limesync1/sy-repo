/**
 * Live drag-validering — letvægts modul-singleton + useSyncExternalStore.
 *
 * RoutePlanner beregner et `ValidationResult` for det aktuelt hovrede
 * drop-target under drag-over (debouncet) og lægger det her. Drop-targets
 * (dag-celler, rute-pillule) læser deres egen status med `useTargetValidation`
 * og kan så vise grøn/gul/rød ring + tooltip — INDEN brugeren slipper.
 *
 * Vi bruger en modul-singleton (ikke React-context) så enhver komponent
 * kan skrive uden at skulle ligge inde i en provider. Det undgår at
 * splitte den enorme RoutePlanner-komponent op for L2-leverancen.
 */
import { useSyncExternalStore } from "react";
import type { ValidationResult } from "@/lib/route-validation";

export type TargetValidation = {
  targetId: string;
  severity: "ok" | "warning" | "error";
  topMessage?: string;
  result: ValidationResult;
};

let current: TargetValidation | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = () => current;

/** Skriv det aktuelle drop-target's validering (kald fra drag-over). */
export function setDragValidation(v: TargetValidation | null) {
  // Skip ekstra emits hvis intet reelt har ændret sig — minder cells
  // om kun at re-render når det betyder noget.
  if (v === current) return;
  if (v && current
    && v.targetId === current.targetId
    && v.severity === current.severity
    && v.topMessage === current.topMessage) return;
  current = v;
  emit();
}
export function clearDragValidation() { setDragValidation(null); }

/**
 * Læs validering for et bestemt target-id (fx `day:2026-05-25` eller
 * `route:abc-123`). Returnerer null hvis dette target ikke er hovret nu.
 */
export function useTargetValidation(targetId: string | null | undefined): TargetValidation | null {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => null);
  if (!snap || !targetId) return null;
  return snap.targetId === targetId ? snap : null;
}

/** Debouncet writer — undgår flimmer under hurtig drag-bevægelse. */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function writeDragValidationDebounced(v: TargetValidation | null, delayMs = 60) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    setDragValidation(v);
  }, delayMs);
}

/**
 * Annullér en ventende debounced skrivning (kaldes ved unmount af planlæggeren)
 * så en gammel validering ikke dukker op efter navigation.
 */
export function cancelPendingDragValidation() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}

/** Map severity → tailwind ring-classes (semantic tokens). */
export function ringForSeverity(s: "ok" | "warning" | "error" | undefined): string {
  if (s === "error") return "ring-2 ring-destructive ring-inset bg-destructive/10";
  if (s === "warning") return "ring-2 ring-warning ring-inset bg-warning/10";
  if (s === "ok") return "ring-2 ring-success ring-inset bg-success/10";
  return "";
}

/** Map severity → label-baggrund til floating "drop-verb"-pille. */
export function chipBgForSeverity(s: "ok" | "warning" | "error" | undefined): string {
  if (s === "error") return "bg-destructive text-destructive-foreground";
  if (s === "warning") return "bg-warning text-warning-foreground";
  if (s === "ok") return "bg-success text-success-foreground";
  return "bg-accent text-accent-foreground";
}

/** Konvertér ValidationResult → severity + kort besked til UI. */
export function summarize(result: ValidationResult): { severity: "ok" | "warning" | "error"; topMessage?: string } {
  if (result.errors.length > 0) return { severity: "error", topMessage: result.errors[0].message };
  if (result.warnings.length > 0) return { severity: "warning", topMessage: result.warnings[0].message };
  return { severity: "ok" };
}