import Link from "next/link";
import type { ActivityItem } from "@/lib/data/activity";
import { formatCoins, formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { RarityBadge } from "@/components/ui/RarityBadge";

function Line({ item }: { item: ActivityItem }) {
  const user = <span className="font-semibold text-chalk">{item.username}</span>;
  const card = item.card ? (
    <Link href={`/wiki/${item.card.playerSlug}`} className="font-semibold text-chalk hover:text-turf hover:underline">
      {item.card.playerName}
    </Link>
  ) : null;

  switch (item.type) {
    case "rare_pull":
      return (
        <>
          {user} a décroché {card} {item.card && <RarityBadge rarity={item.card.rarity} className="ml-1 align-middle" />}
        </>
      );
    case "album_completed":
      return (
        <>
          {user} a complété l&apos;album <span className="font-semibold text-chalk">{item.albumName}</span>
        </>
      );
    case "big_sale":
      return (
        <>
          {user} a vendu {card} pour <span className="font-semibold text-coin">{formatCoins(Number(item.payload.price ?? 0))}</span> pièces
        </>
      );
    case "leaderboard_top10":
      return <>{user} entre dans le top 10 du classement</>;
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-chalk-muted">Le vestiaire est calme pour l&apos;instant.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <Avatar name={item.username} />
          <div className="min-w-0 flex-1 text-sm leading-snug text-chalk-muted">
            <Line item={item} />
            <p className="mt-0.5 text-xs text-chalk-faint">{formatRelative(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
