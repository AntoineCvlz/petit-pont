import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { LiveTradesRefresher } from "@/components/trades/LiveTradesRefresher";
import { TradeCard } from "@/components/trades/TradeCard";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { countPendingReceived, listTrades } from "@/lib/data/trades";
import { parseTradeTab, TRADE_TABS, type TradeTab } from "@/lib/trades";

export const metadata: Metadata = { title: "Échanges" };

const EMPTY: Record<TradeTab, string> = {
  recus: "Aucune proposition reçue pour l'instant.",
  envoyes: "Tu n'as aucune proposition en attente.",
  termines: "Aucun échange terminé.",
};

export default async function EchangesPage({ searchParams }: PageProps<"/echanges">) {
  const profile = await requireProfile();
  const tab = parseTradeTab((await searchParams).onglet);
  const [trades, total, received] = await Promise.all([listTrades(profile.id, tab), getCollectionTotal(), countPendingReceived(profile.id)]);

  return (
    <>
      <LiveTradesRefresher />
      <PageHeader title="Échanges" subtitle="Cartes et pièces, des deux côtés. Expiration automatique au bout de 7 jours.">
        <Link href="/echanges/nouveau" className={buttonClasses("primary", "md")}>
          Proposer un échange
        </Link>
      </PageHeader>

      <nav aria-label="Onglets des échanges" className="mb-4 flex gap-1 border-b border-line">
        {(Object.keys(TRADE_TABS) as TradeTab[]).map((t) => (
          <Link
            key={t}
            href={t === "recus" ? "/echanges" : `/echanges?onglet=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={clsx(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors duration-150",
              tab === t ? "border-turf font-semibold text-chalk" : "border-transparent text-chalk-muted hover:text-chalk",
            )}
          >
            {TRADE_TABS[t]}
            {t === "recus" && received > 0 && (
              <span className="rounded-full bg-turf px-1.5 text-xs font-bold text-turf-ink tabular-nums">{received}</span>
            )}
          </Link>
        ))}
      </nav>

      {trades.length === 0 ? (
        <EmptyState title="Rien sur la table">{EMPTY[tab]}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {trades.map((t) => (
            <li key={t.id}>
              <TradeCard trade={t} viewerId={profile.id} total={total} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
