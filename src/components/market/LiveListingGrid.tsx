"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ListingView } from "@/lib/data/market";
import { formatCoins, formatRelative } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { BuyButton, CancelListingButton } from "./ListingActions";

/**
 * Grille d'annonces en direct : une annonce vendue ou retirée disparaît
 * chez tous les visiteurs (Supabase Realtime), sans rechargement.
 */
export function LiveListingGrid({
  listings,
  viewerId,
  balance,
  collectionTotal,
  showNewBanner = true,
}: {
  listings: ListingView[];
  viewerId: string;
  balance: number;
  collectionTotal: number;
  showNewBanner?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [gone, setGone] = useState<Map<string, "sold" | "cancelled">>(new Map());
  const [newCount, setNewCount] = useState(0);
  const ids = listings.map((l) => l.id).join(",");

  useEffect(() => {
    const visible = new Set(ids.split(","));
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`market-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_listings" }, (payload) => {
        const row = payload.new as { id: string; status: string };
        if (row.status !== "active" && visible.has(row.id)) {
          setGone((prev) => new Map(prev).set(row.id, row.status === "sold" ? "sold" : "cancelled"));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_listings" }, (payload) => {
        const row = payload.new as { seller_id: string };
        if (row.seller_id !== viewerId) setNewCount((n) => n + 1);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ids, viewerId]);

  return (
    <>
      {showNewBanner && newCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setNewCount(0);
            router.refresh();
          }}
          className="mb-3 w-full rounded-lg border border-turf/40 bg-turf/10 px-3 py-2 text-sm font-semibold text-turf hover:bg-turf/20"
        >
          {newCount} nouvelle{newCount > 1 ? "s" : ""} annonce{newCount > 1 ? "s" : ""} — afficher
        </button>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        <AnimatePresence initial={false}>
          {listings
            .filter((l) => !gone.has(l.id) || gone.get(l.id) === "sold")
            .map((l) => {
              const soldLive = gone.get(l.id) === "sold";
              const mine = l.sellerId === viewerId;
              return (
                <motion.li
                  key={l.id}
                  layout={!reduce}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex w-[168px] flex-col gap-2 max-sm:w-[132px]"
                >
                  <Link href={`/marche/carte/${l.template.id}`} className="block rounded-[var(--radius-card)]" aria-label={`Historique de prix : ${l.template.playerName}`}>
                    <Card template={l.template} collectionTotal={collectionTotal} serialNumber={l.serialNumber} className="max-sm:w-[132px]" />
                  </Link>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <CoinAmount amount={l.price} className="text-sm" />
                    <span className="truncate text-chalk-faint" title={`Mis en vente ${formatRelative(l.createdAt)}`}>
                      {mine ? "Toi" : l.sellerUsername}
                    </span>
                  </div>
                  {soldLive ? (
                    <p className="rounded-md bg-night-700 py-1.5 text-center text-xs font-semibold text-chalk-muted" role="status">
                      Vendue
                    </p>
                  ) : mine ? (
                    <CancelListingButton listingId={l.id} onDone={(ok) => ok && setGone((p) => new Map(p).set(l.id, "cancelled"))} />
                  ) : (
                    <BuyButton
                      listingId={l.id}
                      price={l.price}
                      playerName={l.template.playerName}
                      sellerUsername={l.sellerUsername}
                      balance={balance}
                    />
                  )}
                  {soldLive && (
                    <span className="pointer-events-none absolute inset-x-0 top-[38%] text-center font-display text-lg font-extrabold tracking-wider text-chalk uppercase drop-shadow">
                      Vendue · {formatCoins(l.price)}
                    </span>
                  )}
                </motion.li>
              );
            })}
        </AnimatePresence>
      </ul>
    </>
  );
}
