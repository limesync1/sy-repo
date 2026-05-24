/**
 * Beregner og formatterer hvilken "kørsel" en aftale-forekomst er.
 *
 * Bruges alle steder hvor vi viser "1. kørsel", "2. kørsel" osv. så formatet
 * er konsistent på Aftaler-, Kunder-, Rute- og Medarbejder-visninger.
 *
 * Regler:
 *  - Engangskøb (interval=engangskøb eller intet interval) returnerer null.
 *  - For et stop/ordre der allerede er udført viser vi kørselsnummeret som
 *    `completed_cycles` (fx 3. kørsel = den tredje udførelse).
 *  - For et planlagt/igangværende stop viser vi `completed_cycles + 1`
 *    (den næste kørsel der mangler at blive udført).
 *  - Hvis vi har en konkret `sequence_index` fra en agreement_occurrence
 *    bruger vi den som autoritativ kilde (sequence_index + 1).
 */
export type CycleInput = {
  completedCycles?: number | null;
  sequenceIndex?: number | null;
  interval?: string | null;
  isCompleted?: boolean;
};

export function getCycleNumber(input: CycleInput): number | null {
  if (input.interval === "engangskøb") return null;
  if (typeof input.sequenceIndex === "number" && input.sequenceIndex >= 0) {
    return input.sequenceIndex + 1;
  }
  const cycles = Math.max(0, input.completedCycles ?? 0);
  return input.isCompleted ? Math.max(cycles, 1) : cycles + 1;
}

export function formatCycleLabel(input: CycleInput): string | null {
  const n = getCycleNumber(input);
  return n === null ? null : `${n}. kørsel`;
}
