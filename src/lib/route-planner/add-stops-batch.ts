/** Preserve selection order and report partial writes without claiming success. */
export async function addStopsInOrder<T>(
  items: T[],
  save: (item: T, index: number) => Promise<unknown>,
  onProgress?: (completed: number) => void,
) {
  const saved: T[] = [];
  const failed: { item: T; index: number; error: unknown }[] = [];
  for (const [index, item] of items.entries()) {
    try {
      await save(item, index);
      saved.push(item);
    } catch (error) {
      failed.push({ item, index, error });
    }
    onProgress?.(index + 1);
  }
  return { saved, failed };
}