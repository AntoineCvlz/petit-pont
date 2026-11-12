import Link from "next/link";
import { clsx } from "clsx";
import type { TradeView } from "@/lib/data/trades";
import { formatCoins, formatRelative } from "@/lib/format";
import { TRADE_STATUS_LABELS } from "@/lib/trades";

function side(items: TradeView["proposerItems"], coins: number): string {
  const parts = items.map((i) => `${i.template.playerName} #${i.serialNumber}`);
  if (coins > 0) parts.push(`${formatCoins(coins)} pièces`);
  return parts.join(", ") || "rien";
}

/** Échanges vus par l'admin (lecture seule) : qui donne quoi à qui. */
export function AdminTradeList({ trades }: { trades: TradeView[] }) {
  if (trades.length === 0) return <p className="text-sm text-chalk-muted">Aucun échange.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {trades.map((t) => (
        <li key={t.id} className="py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/admin/comptes/${t.proposer.id}`} className="font-semibold hover:underline">
              {t.proposer.username}
            </Link>
            <span className="text-chalk-faint">→</span>
            <Link href={`/admin/comptes/${t.recipient.id}`} className="font-semibold hover:underline">
              {t.recipient.username}
            </Link>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-xs",
                t.status === "accepted" ? "bg-success/15 text-success" : t.status === "pending" ? "bg-coin/15 text-coin" : "bg-night-700 text-chalk-muted",
              )}
            >
              {TRADE_STATUS_LABELS[t.status]}
            </span>
            <span className="text-xs text-chalk-faint">{formatRelative(t.createdAt)}</span>
          </div>
          <p className="mt-1 text-chalk-muted">
            Donne : {side(t.proposerItems, t.proposerCoins)} · Reçoit : {side(t.recipientItems, t.recipientCoins)}
          </p>
          {t.message && <p className="mt-0.5 text-xs text-chalk-faint">« {t.message} »</p>}
        </li>
      ))}
    </ul>
  );
}
