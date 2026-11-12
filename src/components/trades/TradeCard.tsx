import { clsx } from "clsx";
import type { TradeItemView, TradeView } from "@/lib/data/trades";
import { formatCoins, formatRelative } from "@/lib/format";
import { expiresIn, TRADE_STATUS_LABELS } from "@/lib/trades";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { TradeActions } from "./TradeActions";

function Side({ title, items, coins, total }: { title: string; items: TradeItemView[]; coins: number; total: number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-night-800/60 p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-chalk-muted uppercase">{title}</p>
      {items.length === 0 && coins === 0 ? (
        <p className="text-sm text-chalk-faint">Rien</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <Card key={i.instanceId} template={i.template} collectionTotal={total} serialNumber={i.serialNumber} size="sm" interactive={false} />
          ))}
          {coins > 0 && (
            <div className="flex h-[196px] w-[132px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-coin/40 bg-coin/5">
              <CoinAmount amount={coins} className="font-display text-xl" />
              <span className="text-xs text-chalk-muted">pièces</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-coin/15 text-coin",
  accepted: "bg-success/15 text-success",
  declined: "bg-danger/15 text-danger",
  cancelled: "bg-night-600 text-chalk-muted",
  expired: "bg-night-600 text-chalk-muted",
  countered: "bg-r-rare/15 text-r-rare",
};

export function TradeCard({ trade, viewerId, total }: { trade: TradeView; viewerId: string; total: number }) {
  const iAmProposer = trade.proposer.id === viewerId;
  const other = iAmProposer ? trade.recipient : trade.proposer;
  const mine = iAmProposer ? trade.proposerItems : trade.recipientItems;
  const theirs = iAmProposer ? trade.recipientItems : trade.proposerItems;
  const myCoins = iAmProposer ? trade.proposerCoins : trade.recipientCoins;
  const theirCoins = iAmProposer ? trade.recipientCoins : trade.proposerCoins;
  const isPending = trade.status === "pending";

  const describe = (items: TradeItemView[], coins: number) =>
    [items.map((i) => i.template.playerName).join(", "), coins > 0 ? `${formatCoins(coins)} pièces` : ""].filter(Boolean).join(" + ") || "rien";

  return (
    <article className="rounded-xl border border-line bg-night-850 p-4">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <Avatar name={other.username} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            {iAmProposer ? "Ta proposition à " : "Proposition de "}
            <span className="font-semibold">{other.username}</span>
            {trade.parentTradeId && <span className="ml-1 text-xs text-r-rare">(contre-proposition)</span>}
          </p>
          <p className="text-xs text-chalk-faint">
            {formatRelative(trade.createdAt)}
            {isPending && ` · ${expiresIn(trade.expiresAt)}`}
          </p>
        </div>
        <span className={clsx("rounded-md px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[trade.status])}>{TRADE_STATUS_LABELS[trade.status]}</span>
      </header>

      {trade.message && <p className="mb-3 rounded-lg border-l-2 border-line-strong bg-night-800/50 px-3 py-2 text-sm text-chalk-muted italic">« {trade.message} »</p>}

      <div className="flex flex-col gap-3 lg:flex-row">
        <Side title="Tu donnes" items={mine} coins={myCoins} total={total} />
        <div className="flex items-center justify-center text-chalk-faint" aria-hidden="true">
          ⇄
        </div>
        <Side title="Tu reçois" items={theirs} coins={theirCoins} total={total} />
      </div>

      {isPending && (
        <footer className="mt-3">
          <TradeActions
            tradeId={trade.id}
            role={iAmProposer ? "proposer" : "recipient"}
            summary={`Tu donnes ${describe(mine, myCoins)} et tu reçois ${describe(theirs, theirCoins)}.`}
          />
        </footer>
      )}
    </article>
  );
}
