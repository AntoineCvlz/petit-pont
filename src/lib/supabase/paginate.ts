/**
 * PostgREST plafonne chaque réponse (max_rows = 1 000 en local et par défaut sur Supabase).
 * Lit toutes les lignes par pages successives ; la requête fournie doit avoir un ordre stable.
 */
export const PAGE_SIZE = 1000;

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  { pageSize = PAGE_SIZE, max = 50_000 }: { pageSize?: number; max?: number } = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}
