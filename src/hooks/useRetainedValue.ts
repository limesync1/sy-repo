import { useRef } from "react";

/**
 * Husker den seneste ikke-tomme værdi. Bruges af vinduer, hvis data
 * nulstilles i samme øjeblik de lukkes — så indholdet bliver stående
 * mens lukke-animationen kører, i stedet for at forsvinde som et klik.
 */
export function useRetainedValue<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(value ?? null);
  if (value != null) ref.current = value;
  return ref.current;
}
