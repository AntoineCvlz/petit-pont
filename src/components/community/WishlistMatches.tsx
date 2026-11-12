import Link from "next/link";
import type { WishlistMatch } from "@/lib/data/community";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { RarityBadge } from "@/components/ui/RarityBadge";

/** « Ces joueurs ont des cartes de ta liste de souhaits ». */
export function WishlistMatches({ matches }: { matches: WishlistMatch[] }) {
  return (
    <ul className="divide-y divide-line">
      {matches.map((m) => (
        <li key={m.userId} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <Avatar name={m.username} />
          <div className="min-w-0 flex-1">
            <Link href={`/joueurs/${encodeURIComponent(m.username)}`} className="font-semibold hover:text-turf hover:underline">
              {m.username}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-chalk-muted">
              {m.cards.slice(0, 3).map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1">
                  {c.playerName} <RarityBadge rarity={c.rarity} />
                </span>
              ))}
              {m.cards.length > 3 && <span>+{m.cards.length - 3}</span>}
            </p>
          </div>
          <Link href={`/echanges/nouveau?avec=${encodeURIComponent(m.username)}`} className={buttonClasses("secondary", "sm")}>
            Proposer un échange
          </Link>
        </li>
      ))}
    </ul>
  );
}
