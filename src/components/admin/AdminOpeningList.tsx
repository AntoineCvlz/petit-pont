import Link from "next/link";
import { RarityBadge } from "@/components/ui/RarityBadge";
import type { AdminOpening } from "@/lib/data/admin-accounts";
import { formatCoins, formatRelative } from "@/lib/format";
import { compareRarityDesc } from "@/lib/rarity";

/** Ouvertures de boosters : cartes tirées, de la plus rare à la plus commune. */
export function AdminOpeningList({ openings, showPlayer = true }: { openings: AdminOpening[]; showPlayer?: boolean }) {
  if (openings.length === 0) return <p className="text-sm text-chalk-muted">Aucune ouverture.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {openings.map((o) => (
        <li key={o.id} className="py-2.5">
          <p className="flex flex-wrap items-center gap-x-2">
            {showPlayer && (
              <Link href={`/admin/comptes/${o.userId}`} className="font-semibold hover:underline">
                {o.username}
              </Link>
            )}
            <span>{o.boosterName}</span>
            <span className="text-xs text-chalk-faint">
              {o.gifted ? "offert" : o.pricePaid > 0 ? `${formatCoins(o.pricePaid)} pièces` : "gratuit"} · {formatRelative(o.createdAt)}
            </span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {[...o.cards]
              .sort((a, b) => compareRarityDesc(a.rarity, b.rarity) || b.rating - a.rating)
              .map((c, i) => (
                <li key={`${c.id}-${i}`} className="flex items-center gap-1 rounded-md bg-night-800 px-1.5 py-0.5 text-xs">
                  <RarityBadge rarity={c.rarity} />
                  {c.playerName}
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
