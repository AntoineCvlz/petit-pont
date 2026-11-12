import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "@/components/ui/Flag";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { buttonClasses } from "@/components/ui/Button";
import { listPlayers } from "@/lib/data/wiki";
import { POSITION_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Wiki des joueurs" };

export default async function WikiPage({ searchParams }: PageProps<"/wiki">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const players = await listPlayers(search);

  return (
    <>
      <PageHeader title="Wiki des joueurs" subtitle={`${players.length} joueur${players.length > 1 ? "s" : ""}`}>
        <form role="search" className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="q" className="sr-only">
            Rechercher un joueur
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Rechercher un joueur…"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none sm:w-64"
          />
          <button type="submit" className={buttonClasses("secondary", "sm", "h-9")}>
            Chercher
          </button>
        </form>
      </PageHeader>

      {players.length === 0 ? (
        <EmptyState title="Hors-jeu !">Aucun joueur ne correspond à « {search} ».</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {players.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/wiki/${p.slug}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-night-850 px-3 py-2.5 transition-colors duration-150 hover:border-line-strong hover:bg-night-800"
              >
                <Flag nation={p.nation} className="h-4 w-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="text-xs text-chalk-muted">
                    {POSITION_LABELS[p.position]} · {p.versions} version{p.versions > 1 ? "s" : ""}
                    {p.isLegend && " · Légende"}
                  </p>
                </div>
                {p.bestRarity && <RarityBadge rarity={p.bestRarity} />}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-chalk-faint">
        Photos sous licence libre (Wikimedia Commons) :{" "}
        <Link href="/credits" className="text-chalk-muted underline hover:text-chalk">
          crédits des images
        </Link>
        .
      </p>
    </>
  );
}
