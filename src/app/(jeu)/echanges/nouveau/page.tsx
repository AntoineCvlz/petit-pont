import type { Metadata } from "next";
import Link from "next/link";
import { TradeComposer } from "@/components/trades/TradeComposer";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { getCollectionTotal } from "@/lib/data/cards";
import { requireProfile } from "@/lib/data/profile";
import { findPlayerByUsername, getOwnedTemplateIds, getTrade, getTradableCopies, getWishlistTemplateIds } from "@/lib/data/trades";

export const metadata: Metadata = { title: "Proposer un échange" };

export default async function NewTradePage({ searchParams }: PageProps<"/echanges/nouveau">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const counterId = typeof params.contre === "string" ? params.contre : null;
  const withName = typeof params.avec === "string" ? params.avec : "";

  // Contre-proposition : le partenaire est l'auteur de la proposition reçue
  const parent = counterId ? await getTrade(counterId) : null;
  const validParent = parent && parent.status === "pending" && parent.recipient.id === profile.id ? parent : null;
  const partner = validParent ? validParent.proposer : withName ? await findPlayerByUsername(withName) : null;
  const self = partner?.id === profile.id;

  const header = (
    <>
      <Link href="/echanges" className="text-sm text-chalk-muted hover:text-chalk">
        ← Échanges
      </Link>
      <PageHeader
        title={validParent ? "Contre-proposition" : "Proposer un échange"}
        subtitle={partner && !self ? `Avec ${partner.username}` : "Choisis le joueur avec qui échanger."}
      />
    </>
  );

  if (counterId && !validParent) {
    return (
      <>
        {header}
        <EmptyState title="Proposition indisponible">Cette proposition n&apos;est plus en attente.</EmptyState>
      </>
    );
  }

  if (!partner || self) {
    return (
      <>
        {header}
        <form className="flex max-w-md flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Pseudo du joueur</span>
            <input
              name="avec"
              defaultValue={withName}
              required
              minLength={3}
              maxLength={20}
              placeholder="ex. Rabona"
              className="h-10 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
            />
          </label>
          <button type="submit" className={buttonClasses("primary", "md")}>
            Continuer
          </button>
        </form>
        {withName && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {self ? "Tu ne peux pas échanger avec toi-même." : `Aucun joueur nommé « ${withName} ».`}
          </p>
        )}
      </>
    );
  }

  const [myCopies, theirCopies, partnerWishlist, myOwned, total] = await Promise.all([
    getTradableCopies(profile.id),
    getTradableCopies(partner.id),
    getWishlistTemplateIds(partner.id),
    getOwnedTemplateIds(profile.id),
    getCollectionTotal(),
  ]);
  const owned = new Set(myOwned);
  const myMissing = [...new Set(theirCopies.map((c) => c.template.id))].filter((id) => !owned.has(id));

  // Préremplissage de la contre-proposition : on inverse les côtés de l'offre reçue
  const available = (ids: string[], pool: typeof myCopies) => ids.filter((id) => pool.some((c) => c.instanceId === id));
  const initial = validParent
    ? {
        offered: available(validParent.recipientItems.map((i) => i.instanceId), myCopies),
        requested: available(validParent.proposerItems.map((i) => i.instanceId), theirCopies),
        giveCoins: validParent.recipientCoins,
        askCoins: validParent.proposerCoins,
      }
    : undefined;

  return (
    <>
      {header}
      <TradeComposer
        partner={partner}
        myCopies={myCopies}
        theirCopies={theirCopies}
        partnerWishlist={partnerWishlist}
        myMissing={myMissing}
        myCoins={profile.coins}
        total={total}
        parentTradeId={validParent?.id ?? null}
        initial={initial}
      />
    </>
  );
}
