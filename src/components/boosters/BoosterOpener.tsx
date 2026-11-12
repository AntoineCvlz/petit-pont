"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";
import { openBooster, sellDuplicates, type PulledCard } from "@/lib/actions/boosters";
import { duplicatesValue, type BoosterKind } from "@/lib/boosters";
import { formatCoins } from "@/lib/format";
import { isPublicPull, rarityRank, type Rarity } from "@/lib/rarity";
import { playReveal, playTear } from "@/lib/sound";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CoinIcon } from "@/components/ui/CoinAmount";
import { LogoMark } from "@/components/brand/Logo";
import { BoosterPack } from "./BoosterPack";

type Phase = "idle" | "opening" | "tearing" | "reveal";

export type OpenerBooster = {
  id: number;
  name: string;
  kind: BoosterKind;
  price: number;
  cardsCount: number;
  imageUrl: string | null;
};

export function BoosterOpener({
  booster,
  unavailableReason,
  balance,
  collectionTotal,
  duplicatePrices,
  soundEnabled,
  reducedMotion: profileReducedMotion,
}: {
  booster: OpenerBooster;
  unavailableReason: string | null;
  balance: number;
  collectionTotal: number;
  duplicatePrices: Partial<Record<Rarity, number>>;
  soundEnabled: boolean;
  reducedMotion: boolean;
}) {
  const router = useRouter();
  const systemReduced = useReducedMotion();
  const reduce = Boolean(systemReduced || profileReducedMotion);

  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<PulledCard[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sold, setSold] = useState<{ count: number; coins: number } | null>(null);
  const [selling, startSelling] = useTransition();
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => revealTimers.current.forEach(clearTimeout), []);

  const cantAfford = booster.price > balance;
  const allRevealed = cards.length > 0 && revealed.size === cards.length;
  const duplicates = cards.filter((c) => !c.isNew);
  const dupValue = duplicatesValue(
    duplicates.map((c) => c.template.rarity),
    duplicatePrices,
  );
  const bestPull = cards.reduce<PulledCard | null>(
    (best, c) => (!best || rarityRank(c.template.rarity) > rarityRank(best.template.rarity) ? c : best),
    null,
  );

  async function handleOpen() {
    setError(null);
    setSold(null);
    setPhase("opening");
    const result = await openBooster(booster.id);
    if (!result.ok) {
      setError(result.message);
      setPhase("idle");
      router.refresh();
      return;
    }
    setCards(result.cards);
    setRevealed(new Set());
    if (soundEnabled) playTear();
    setPhase(reduce ? "reveal" : "tearing");
    if (!reduce) setTimeout(() => setPhase("reveal"), 700);
    router.refresh(); // solde, compte à rebours, stock
  }

  function reveal(index: number) {
    setRevealed((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    if (soundEnabled) playReveal(rarityRank(cards[index]!.template.rarity));
  }

  function revealAll() {
    revealTimers.current.forEach(clearTimeout);
    const hidden = cards.map((_, i) => i).filter((i) => !revealed.has(i));
    if (reduce) {
      hidden.forEach((i) => reveal(i));
      return;
    }
    revealTimers.current = hidden.map((i, k) => setTimeout(() => reveal(i), k * 220));
  }

  function handleSell() {
    startSelling(async () => {
      const result = await sellDuplicates(duplicates.map((c) => c.instanceId));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSold({ count: result.sold, coins: result.coins });
      router.refresh();
    });
  }

  function reset() {
    revealTimers.current.forEach(clearTimeout);
    setPhase("idle");
    setCards([]);
    setRevealed(new Set());
    setSold(null);
    setError(null);
  }

  // --- Avant ouverture -------------------------------------------------------
  if (phase === "idle" || phase === "opening") {
    const disabled = phase === "opening" || unavailableReason !== null || cantAfford;
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="rounded-lg transition-transform duration-150 enabled:hover:-translate-y-1 disabled:cursor-not-allowed"
        >
          <BoosterPack
            name={booster.name}
            kind={booster.kind}
            cardsCount={booster.cardsCount}
            imageUrl={booster.imageUrl}
            size="lg"
            className={clsx(phase === "opening" && "pp-shake", disabled && phase !== "opening" && "opacity-60 grayscale-[40%]")}
          />
        </button>
        <Button onClick={handleOpen} disabled={disabled} className="min-w-52">
          {phase === "opening" ? (
            "Ouverture…"
          ) : unavailableReason ? (
            unavailableReason
          ) : cantAfford ? (
            "Pas assez de pièces"
          ) : booster.price === 0 ? (
            "Ouvrir gratuitement"
          ) : (
            <>
              Ouvrir pour <CoinIcon /> {formatCoins(booster.price)}
            </>
          )}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  // --- Déchirure -------------------------------------------------------------
  if (phase === "tearing") {
    return (
      <div className="relative flex h-[340px] items-center justify-center overflow-hidden" aria-live="polite">
        <span className="sr-only">Ouverture du booster…</span>
        <motion.div
          className="absolute"
          style={{ clipPath: "inset(0 0 62% 0)" }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{ y: -160, rotate: -14, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeIn" }}
        >
          <BoosterPack name={booster.name} kind={booster.kind} cardsCount={booster.cardsCount} imageUrl={booster.imageUrl} size="lg" />
        </motion.div>
        <motion.div
          className="absolute"
          style={{ clipPath: "inset(38% 0 0 0)" }}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: 140, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeIn", delay: 0.05 }}
        >
          <BoosterPack name={booster.name} kind={booster.kind} cardsCount={booster.cardsCount} imageUrl={booster.imageUrl} size="lg" />
        </motion.div>
        <motion.div
          className="absolute h-1 w-56 rounded-full bg-chalk"
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1.4, 1.8] }}
          transition={{ duration: 0.45 }}
          style={{ top: "38%" }}
        />
      </div>
    );
  }

  // --- Révélation et récapitulatif -------------------------------------------
  const bigPull = allRevealed && bestPull && isPublicPull(bestPull.template.rarity);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-xl font-extrabold tracking-wide uppercase italic" aria-live="polite">
          {!allRevealed
            ? `${revealed.size} / ${cards.length} révélée${revealed.size > 1 ? "s" : ""}`
            : bigPull
              ? "Petit pont réussi !"
              : duplicates.length === cards.length
                ? "Raté, que des doublons…"
                : "Bien joué !"}
        </p>
        {!allRevealed && (
          <Button variant="secondary" size="sm" onClick={revealAll}>
            Tout révéler
          </Button>
        )}
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {cards.map((c, i) => (
          <li key={c.instanceId}>
            <FlipCard
              card={c}
              index={i}
              revealed={revealed.has(i)}
              onReveal={() => reveal(i)}
              reduce={reduce}
              collectionTotal={collectionTotal}
              showBadge={allRevealed}
              sold={sold !== null && !c.isNew}
            />
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {allRevealed && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3 rounded-xl border border-line bg-night-850 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-chalk-muted">
              <span className="font-semibold text-success">{cards.length - duplicates.length} nouvelle{cards.length - duplicates.length > 1 ? "s" : ""}</span>
              {" · "}
              <span className="font-semibold text-chalk">{duplicates.length} doublon{duplicates.length > 1 ? "s" : ""}</span>
              {sold && (
                <>
                  {" · "}
                  <span className="text-coin">
                    {sold.count} revendu{sold.count > 1 ? "s" : ""} pour {formatCoins(sold.coins)} pièces
                  </span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {duplicates.length > 0 && !sold && (
                <Button variant="secondary" size="sm" onClick={handleSell} disabled={selling}>
                  {selling ? (
                    "Revente…"
                  ) : (
                    <>
                      Revendre les doublons (+<CoinIcon className="h-3.5 w-3.5" />
                      {formatCoins(dupValue)})
                    </>
                  )}
                </Button>
              )}
              <Link href="/collection" className={buttonClasses("ghost", "sm")}>
                Ma collection
              </Link>
              <Button size="sm" onClick={reset}>
                Ouvrir un autre booster
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FlipCard({
  card,
  index,
  revealed,
  onReveal,
  reduce,
  collectionTotal,
  showBadge,
  sold,
}: {
  card: PulledCard;
  index: number;
  revealed: boolean;
  onReveal: () => void;
  reduce: boolean;
  collectionTotal: number;
  showBadge: boolean;
  sold: boolean;
}) {
  const high = isPublicPull(card.template.rarity);
  return (
    <motion.div
      className="pp-flip relative"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: sold ? 0.45 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.06 }}
    >
      <button
        type="button"
        onClick={onReveal}
        disabled={revealed}
        aria-label={revealed ? `${card.template.playerName} révélé` : `Révéler la carte ${index + 1}`}
        className="block rounded-[var(--radius-card)] disabled:cursor-default max-sm:w-[132px]"
      >
        <motion.div
          className="pp-flip-inner"
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.3, 0.7, 0.3, 1] }}
        >
          <div className="pp-face pp-card-back flex aspect-[5/7.4] w-[168px] items-center justify-center max-sm:w-[132px]">
            <LogoMark className="h-12 w-12 opacity-80" />
          </div>
          <div className="pp-face pp-face-front">
            <Card
              template={card.template}
              collectionTotal={collectionTotal}
              serialNumber={card.serialNumber}
              interactive={false}
              className="max-sm:w-[132px]"
            />
          </div>
        </motion.div>
      </button>

      {revealed && high && !reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 rounded-2xl"
          style={{ boxShadow: `0 0 40px 6px var(--color-r-${card.template.rarity})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.35] }}
          transition={{ duration: 1.1 }}
        />
      )}

      {showBadge && (
        <span
          className={clsx(
            "absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-md px-2 py-0.5 font-display text-[11px] font-extrabold tracking-wider uppercase shadow",
            sold ? "bg-night-600 text-chalk-muted" : card.isNew ? "bg-success text-night-950" : "bg-night-600 text-chalk",
          )}
        >
          {sold ? "Revendu" : card.isNew ? "Nouveau" : "Doublon"}
        </span>
      )}
    </motion.div>
  );
}
