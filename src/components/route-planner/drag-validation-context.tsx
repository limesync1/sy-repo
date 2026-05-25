/**
 * Live drag-validering kontekst.
 *
 * RoutePlanner beregner et `ValidationResult` for det aktuelt hovrede
 * drop-target under drag-over (debouncet) og lægger det her. Drop-targets
 * (dag-celler, rute-pillule) læser deres egen status med `useTargetValidation`
 * og kan så vise grøn/gul/rød ring + tooltip — INDEN brugeren slipper.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { ValidationResult } from "@/lib/route-validation";

export type TargetValidation = {
  targetId: string;
  severity: "ok" | "warning" | "error";
  topMessage?: string;
  result: ValidationResult;
};

type Ctx = {
  current: TargetValidation | null;
  setCurrent: (v: TargetValidation | null) => void;
};

const DragValidationCtx = createContext<Ctx>({ current: null, setCurrent: () => {} });

export function DragValidationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<TargetValidation | null>(null);
  const value = useMemo(() => ({ current, setCurrent }), [current]);
  return <DragValidationCtx.Provider value={value}>{children}</DragValidationCtx.Provider>;
}

/**
 * Læs validering for et bestemt target-id (fx `day:2026-05-25` eller
 * `route:abc-123`). Returnerer null hvis dette target ikke er hovret nu.
 */
export function useTargetValidation(targetId: string | null | undefined): TargetValidation | null {
  const { current } = useContext(DragValidationCtx);
  if (!current || !targetId) return null;
  return current.targetId === targetId ? current : null;
}

/** Skriv siden af RoutePlanner — debouncet hjælper. */
export function useDragValidationWriter() {
  const { setCurrent } = useContext(DragValidationCtx);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const write = useCallback((v: TargetValidation | null) => {
    if (timer.current) clearTimeout(timer.current);
    // 80 ms — hurtigt nok til at føles realtid, langsomt nok til at
    // undgå at trigge dyre re-renders på hver pixel.
    timer.current = setTimeout(() => setCurrent(v), 80);
  }, [setCurrent]);
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
  }, [setCurrent]);
  return { write, clear };
}

/** Map severity → tailwind ring-classes (semantic tokens). */
export function ringForSeverity(s: "ok" | "warning" | "error" | undefined): string {
  if (s === "error") return "ring-2 ring-destructive ring-inset bg-destructive/10";
  if (s === "warning") return "ring-2 ring-amber-500 ring-inset bg-amber-500/10";
  if (s === "ok") return "ring-2 ring-emerald-500 ring-inset bg-emerald-500/10";
  return "";
}

/** Konvertér ValidationResult → severity + kort besked til UI. */
export function summarize(result: ValidationResult): { severity: "ok" | "warning" | "error"; topMessage?: string } {
  if (result.errors.length > 0) return { severity: "error", topMessage: result.errors[0].message };
  if (result.warnings.length > 0) return { severity: "warning", topMessage: result.warnings[0].message };
  return { severity: "ok" };
}