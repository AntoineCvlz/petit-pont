import { describe, expect, it } from "vitest";
import { fetchAll } from "@/lib/supabase/paginate";

function fakeTable(n: number) {
  const rows = Array.from({ length: n }, (_, i) => i);
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { page, calls };
}

describe("lecture paginée", () => {
  it("lit tout au-delà de la limite d'une page", async () => {
    const t = fakeTable(2345);
    const all = await fetchAll(t.page);
    expect(all).toHaveLength(2345);
    expect(all.at(-1)).toBe(2344);
    expect(t.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("s'arrête dès qu'une page est incomplète (une seule requête)", async () => {
    const t = fakeTable(12);
    expect(await fetchAll(t.page)).toHaveLength(12);
    expect(t.calls).toHaveLength(1);
  });

  it("fait une requête de plus quand le total est un multiple exact", async () => {
    const t = fakeTable(2000);
    expect(await fetchAll(t.page)).toHaveLength(2000);
    expect(t.calls).toHaveLength(3);
  });

  it("propage les erreurs", async () => {
    await expect(fetchAll(async () => ({ data: null, error: new Error("boom") }))).rejects.toThrow("boom");
  });
});
