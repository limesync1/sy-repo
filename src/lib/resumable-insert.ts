/** Keep stable IDs and reconcile uncertain writes before retrying an insert. */
export interface InsertStage<T extends { id: string }> {
  rows: T[];
  attempted: boolean;
  complete: boolean;
}

export function createInsertStage<T extends { id: string }>(rows: T[]): InsertStage<T> {
  return { rows, attempted: false, complete: false };
}

export async function resumeInsert<T extends { id: string }>(
  stage: InsertStage<T>,
  store: {
    existingIds: (ids: string[]) => Promise<string[]>;
    insert: (rows: T[]) => Promise<void>;
  },
): Promise<void> {
  if (stage.complete) return;
  let remaining = stage.rows;
  if (stage.attempted) {
    const existing = new Set(await store.existingIds(stage.rows.map((row) => row.id)));
    remaining = stage.rows.filter((row) => !existing.has(row.id));
  }
  stage.attempted = true;
  if (remaining.length > 0) await store.insert(remaining);
  stage.complete = true;
}