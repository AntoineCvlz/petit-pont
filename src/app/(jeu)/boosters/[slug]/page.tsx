import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoosterOpener } from "@/components/boosters/BoosterOpener";
import { FreeBoosterTimer } from "@/components/boosters/FreeBoosterTimer";
import { LiveStock } from "@/components/boosters/LiveStock";
import { OddsTable } from "@/components/boosters/OddsTable";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { availabilityLabel, BOOSTER_KIND_LABELS } from "@/lib/boosters";
import { getCollectionTotal } from "@/lib/data/cards";
import { getBooster, getBoosterPool, getDuplicatePrices, listMyGifts } from "@/lib/data/boosters";
import { requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export async function generateMetadata({ params }: PageProps<"/boosters/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const booster = await getBooster(slug);
  return { title: booster?.name ?? "Booster introuvable" };
}

export default async function BoosterPage({ params, searchParams }: PageProps<"/boosters/[slug]">) {
  const [{ slug }, { cadeau }] = await Promise.all([params, searchParams]);
  const [profile, booster, total, prices, gifts] = await Promise.all([
    requireProfile(),
    getBooster(slug),
    getCollectionTotal(),
    getDuplicatePrices(),
    listMyGifts(),
  ]);
  if (!booster) notFound();
  // Mode « pack offert » : le prochain pack non ouvert de ce booster (enchaîne les ouvertures)
  const gift = gifts.find((g) => g.slug === slug) ?? null;
  const grantId = cadeau !== undefined && gift ? gift.nextGrantId : null;
  const pool = await getBoosterPool(booster.id);
  const a = booster.availability;

  return (
    <>
      <Link href="/boosters" className="text-sm text-chalk-muted hover:text-chalk">
        ← Boosters
      </Link>
      <div className="mt-3 mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{booster.name}</h1>
        <span className="rounded-md border border-line-strong px-2 py-0.5 font-display text-xs font-bold tracking-wider text-chalk-muted uppercase">
          {BOOSTER_KIND_LABELS[booster.kind]}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Panel>
          {grantId && gift && (
            <p className="mb-2 rounded-lg border border-turf/40 bg-turf/10 px-3 py-2 text-center text-sm">
              Pack offert par l&apos;équipe{gift.count > 1 ? ` · ${gift.count} à ouvrir` : ""}
            </p>
          )}
          {!grantId && gift && (
            <p className="mb-2 text-center text-sm">
              <Link href={`/boosters/${slug}?cadeau`} className="font-semibold text-turf hover:underline">
                Tu as {gift.count} pack{gift.count > 1 ? "s" : ""} offert{gift.count > 1 ? "s" : ""} à ouvrir
              </Link>
            </p>
          )}
          <BoosterOpener
            booster={{
              id: booster.id,
              name: booster.name,
              kind: booster.kind,
              price: booster.price,
              cardsCount: booster.cardsCount,
              imageUrl: booster.imageUrl,
            }}
            unavailableReason={availabilityLabel(a)}
            balance={profile.coins}
            collectionTotal={total}
            duplicatePrices={prices}
            soundEnabled={profile.soundEnabled}
            reducedMotion={profile.reducedMotion}
            grantId={grantId}
          />
          {!a.available && a.reason === "cooldown" && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-chalk-muted">
              Prochain booster gratuit dans <FreeBoosterTimer slug={booster.slug} nextAt={a.nextAt} />
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Fiche">
            {booster.description && <p className="mb-3 text-sm text-chalk-muted">{booster.description}</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-chalk-faint">Prix</dt>
              <dd>{booster.price === 0 ? <span className="text-turf">Gratuit</span> : <CoinAmount amount={booster.price} />}</dd>
              <dt className="text-chalk-faint">Cartes</dt>
              <dd>{booster.cardsCount}</dd>
              {booster.guaranteeRarity && booster.guaranteeCount > 0 && (
                <>
                  <dt className="text-chalk-faint">Garantie</dt>
                  <dd>
                    Au moins {booster.guaranteeCount} <RarityBadge rarity={booster.guaranteeRarity} /> ou mieux
                  </dd>
                </>
              )}
              {booster.startsAt && booster.endsAt && (
                <>
                  <dt className="text-chalk-faint">Période</dt>
                  <dd>
                    {formatDate(booster.startsAt)} → {formatDate(booster.endsAt)}
                  </dd>
                </>
              )}
            </dl>
            {booster.kind === "limited" && booster.stockTotal !== null && booster.stockRemaining !== null && (
              <div className="mt-4">
                <LiveStock boosterId={booster.id} initial={booster.stockRemaining} total={booster.stockTotal} />
              </div>
            )}
          </Panel>
          <Panel title="Probabilités par carte">
            <OddsTable odds={booster.odds} />
          </Panel>
        </div>
      </div>

      <Panel title={`Cartes possibles (${pool.length})`} className="mt-5">
        <div className="space-y-4">
          {RARITIES.toReversed().map((r) => {
            const cards = pool.filter((c) => c.rarity === r);
            if (cards.length === 0) return null;
            return (
              <details key={r} open={cards.length <= 12}>
                <summary className="cursor-pointer font-display text-sm font-bold tracking-wider uppercase" style={{ color: `var(--color-r-${r})` }}>
                  {RARITY_LABELS[r]} · {cards.length}
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {cards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/wiki/${c.playerSlug}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-night-800 px-2 py-1 text-xs hover:border-line-strong"
                      >
                        <span className="font-display font-bold tabular-nums">{c.rating}</span>
                        {c.playerName}
                        {c.edition !== "Base" && <span className="text-chalk-faint">· {c.edition}</span>}
                        {c.maxSupply !== null && (
                          <span className="text-chalk-faint tabular-nums">
                            {c.mintedCount}/{c.maxSupply}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
