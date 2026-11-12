import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopySeller } from "@/components/collection/CopySeller";
import { CancelListingButton } from "@/components/market/ListingActions";
import { SellForm } from "@/components/market/SellForm";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Card } from "@/components/ui/Card";
import { getDuplicatePrices } from "@/lib/data/boosters";
import { getMarketFeePercent, getPriceStats, listMyListings } from "@/lib/data/market";
import { suggestedPrice } from "@/lib/market";
import { Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { getCollectionTotal, getOwnedCard, type CopyHistoryEvent } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { formatCoins, formatDate, formatSerial } from "@/lib/format";
import { POSITION_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Détail de la carte" };

const VIA_LABELS: Record<string, string> = {
  booster: "Booster",
  seed: "Dotation initiale",
  market: "Marché",
  trade: "Échange",
};

function describe(h: CopyHistoryEvent): string {
  switch (h.event) {
    case "minted":
      return `Éditée${h.toUsername ? ` pour ${h.toUsername}` : ""}`;
    case "market_sale":
      return `Vendue par ${h.fromUsername ?? "un joueur"} à ${h.toUsername ?? "un joueur"}${h.price ? ` pour ${formatCoins(h.price)} pièces` : ""}`;
    case "trade":
      return `Échangée de ${h.fromUsername ?? "un joueur"} à ${h.toUsername ?? "un joueur"}`;
    default:
      return h.event;
  }
}

export default async function CardDetailPage({ params }: PageProps<"/collection/[templateId]">) {
  const { templateId } = await params;
  const id = Number(templateId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const profile = await requireProfile();
  const [card, total, prices, myListings, feePercent, stats] = await Promise.all([
    getOwnedCard(profile.id, id),
    getCollectionTotal(),
    getDuplicatePrices(),
    listMyListings(profile.id),
    getMarketFeePercent(),
    getPriceStats(id),
  ]);
  if (!card) notFound();
  const t = card.template;
  const unitPrice = prices[t.rarity] ?? 0;
  const listingByInstance = new Map(
    myListings.filter((l) => l.template.id === t.id).map((l) => [l.serialNumber, l] as const),
  );
  const freeCopies = card.copies.filter((c) => !c.isLocked);

  return (
    <>
      <Link href="/collection" className="text-sm text-chalk-muted hover:text-chalk">
        ← Collection
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center md:block">
          <Card template={t} collectionTotal={total} serialNumber={card.copies[0]!.serialNumber} size="lg" />
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{t.playerName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-chalk-muted">
              <RarityBadge rarity={t.rarity} />
              <span>{t.edition === "Base" ? t.season : `${t.edition} · ${t.season}`}</span>
              <span>·</span>
              <span>{t.club?.name ?? "Sans club"}</span>
              <span>·</span>
              <span>{POSITION_LABELS[t.position]}</span>
              <span>·</span>
              <span>Note {t.rating}</span>
            </div>
            <p className="mt-2 text-sm">
              <Link href={`/wiki/${t.playerSlug}`} className="font-semibold text-turf hover:underline">
                Fiche du joueur
              </Link>
              {" · "}
              <Link href={`/marche/carte/${t.id}`} className="font-semibold text-turf hover:underline">
                Prix sur le marché
              </Link>
            </p>
          </div>

          <Panel title={`Mes exemplaires (${card.copies.length})`}>
            <ul className="divide-y divide-line">
              {card.copies.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg font-bold tabular-nums">{formatSerial(c.serialNumber, t.maxSupply)}</p>
                    <div className="flex items-center gap-2 text-xs text-chalk-muted">
                      <span>{VIA_LABELS[c.obtainedVia] ?? c.obtainedVia}</span>
                      <span>·</span>
                      <span>Obtenu le {formatDate(c.obtainedAt)}</span>
                      {c.isLocked && !listingByInstance.has(c.serialNumber) && (
                        <span className="rounded-md border border-coin/40 px-1.5 py-px text-coin">Verrouillé</span>
                      )}
                      {listingByInstance.has(c.serialNumber) && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-coin/40 px-1.5 py-px text-coin">
                          En vente · <CoinAmount amount={listingByInstance.get(c.serialNumber)!.price} className="text-xs" />
                        </span>
                      )}
                      {listingByInstance.has(c.serialNumber) && (
                        <span className="w-20">
                          <CancelListingButton listingId={listingByInstance.get(c.serialNumber)!.id} />
                        </span>
                      )}
                    </div>
                  </div>
                  {c.history.length > 0 && (
                    <ol className="mt-2 space-y-1 border-l border-line-strong pl-3 text-xs text-chalk-muted">
                      {c.history.map((h, i) => (
                        <li key={i}>
                          <span className="text-chalk-faint">{formatDate(h.createdAt)}</span> — {describe(h)}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Mettre en vente sur le marché">
            <SellForm
              copies={freeCopies.map((c) => ({ id: c.id, label: formatSerial(c.serialNumber, t.maxSupply) }))}
              suggested={suggestedPrice(stats?.avgPrice ?? null, unitPrice)}
              feePercent={feePercent}
              systemPrice={unitPrice}
            />
          </Panel>

          {card.copies.length > 1 && (
            <Panel title="Revendre des doublons au système">
              <CopySeller
                copies={card.copies.map((c) => ({ id: c.id, label: formatSerial(c.serialNumber, t.maxSupply), isLocked: c.isLocked }))}
                unitPrice={unitPrice}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
