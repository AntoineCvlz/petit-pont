import type { Metadata } from "next";
import Link from "next/link";
import { WishlistMatches } from "@/components/community/WishlistMatches";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { getWishlistMatches, searchPlayers } from "@/lib/data/community";
import { requireProfile } from "@/lib/data/profile";
import { formatMetric } from "@/lib/leaderboard";

export const metadata: Metadata = { title: "Joueurs" };

export default async function JoueursPage({ searchParams }: PageProps<"/joueurs">) {
  const profile = await requireProfile();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const [players, matches] = await Promise.all([searchPlayers(search), getWishlistMatches(6)]);
  const others = players.filter((p) => p.id !== profile.id);

  return (
    <>
      <PageHeader title="Joueurs" subtitle="Trouve des partenaires d'échange et compare vos collections.">
        <form role="search" className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="q" className="sr-only">
            Rechercher un pseudo
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={20}
            placeholder="Pseudo…"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none sm:w-56"
          />
          <button type="submit" className={buttonClasses("secondary", "sm", "h-9")}>
            Chercher
          </button>
        </form>
      </PageHeader>

      {matches.length > 0 && !search && (
        <Panel title="Ils ont des cartes de ta liste de souhaits" className="mb-5">
          <WishlistMatches matches={matches} />
        </Panel>
      )}

      {others.length === 0 ? (
        <EmptyState title="Personne sur le terrain">Aucun joueur ne correspond à « {search} ».</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((p) => (
            <li key={p.id}>
              <Link
                href={`/joueurs/${encodeURIComponent(p.username)}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-night-850 px-3 py-2.5 transition-colors duration-150 hover:border-line-strong hover:bg-night-800"
              >
                <Avatar name={p.username} url={p.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.username}</p>
                  {p.stats && (
                    <p className="text-xs text-chalk-muted">
                      {p.stats.cards} cartes · {formatMetric("progression", p.stats.progression)} · {p.stats.albums} album
                      {p.stats.albums > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
