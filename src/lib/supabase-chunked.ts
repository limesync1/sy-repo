// Små hjælpere til store opslag. Lange `.in()`-lister bliver til meget lange
// adresser, som serveren afviser, og hvert svar er højst 1000 rækker — så vi
// deler id-lister op og bladrer gennem resultater.

export const IN_CHUNK = 150;

export function chunk<T>(items: T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Kører `run` for hver del af `ids` (parallelt) og samler rækkerne. */
export async function selectInChunks<R>(
  ids: string[],
  run: (part: string[]) => PromiseLike<{ data: R[] | null; error: any }>,
  size = IN_CHUNK,
): Promise<R[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const results = await Promise.all(chunk(unique, size).map((part) => run(part)));
  const rows: R[] = [];
  for (const { data, error } of results) {
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

/** Bladrer gennem alle rækker i sider af 1000. `build` skal give en ny, sorteret forespørgsel. */
export async function selectAllPages<R>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: R[] | null; error: any }> },
  page = 1000,
): Promise<R[]> {
  const all: R[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build().range(from, from + page - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return all;
}
