import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "@/components/ui/Flag";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { buttonClasses } from "@/components/ui/Button";
import { listPlayers, WIKI_PAGE_SIZE } from "@/lib/data/wiki";
import { POSITION_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Wiki des joueurs" };

export default async function WikiPage({ searchParams }: PageProps<"/wiki">) {
  const { q, page: pageParam } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const page = Math.max(1, Math.min(10_000, Number(typeof pageParam === "string" ? pageParam : 1) || 1));
  const { players, total } = await listPlayers(search, page);
  const pages = Math.max(1, Math.ceil(total / WIKI_PAGE_SIZE));
  const pageHref = (p: number) => `/wiki?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Wiki des joueurs"
        subtitle={`${total.toLocaleString("fr-FR")} joueur${total > 1 ? "s" : ""}${pages > 1 ? ` · page ${page}/${pages}` : ""}`}
      >
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
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonClasses("secondary", "sm")}>
              ← Précédents
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-chalk-muted tabular-nums">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={buttonClasses("secondary", "sm")}>
              Suivants →
            </Link>
          ) : (
            <span />
          )}
        </nav>
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
