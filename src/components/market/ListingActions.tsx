"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buyListing, cancelListing } from "@/lib/actions/market";
import { formatCoins } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/CoinAmount";
import { Modal } from "@/components/ui/Modal";

export function BuyButton({
  listingId,
  price,
  playerName,
  sellerUsername,
  balance,
  onDone,
}: {
  listingId: string;
  price: number;
  playerName: string;
  sellerUsername: string;
  balance: number;
  onDone?: (ok: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const tooExpensive = price > balance;

  function confirm() {
    start(async () => {
      const r = await buyListing(listingId);
      setMessage({ ok: r.ok, text: r.message });
      onDone?.(r.ok);
      if (r.ok) setOpen(false);
      router.refresh();
    });
  }

  if (message?.ok) {
    return (
      <p role="status" className="text-xs font-semibold text-success">
        Achetée !
      </p>
    );
  }

  return (
    <>
      <Button size="sm" className="w-full" disabled={tooExpensive} onClick={() => { setMessage(null); setOpen(true); }}>
        {tooExpensive ? "Pas assez de pièces" : "Acheter"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmer l'achat"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={confirm} disabled={pending}>
              {pending ? "Achat…" : (
                <>
                  Payer <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(price)}
                </>
              )}
            </Button>
          </>
        }
      >
        <p>
          <span className="font-semibold text-chalk">{playerName}</span> vendu par{" "}
          <span className="font-semibold text-chalk">{sellerUsername}</span>.
        </p>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
          <dt>Prix</dt>
          <dd className="text-right font-semibold text-chalk tabular-nums">{formatCoins(price)}</dd>
          <dt>Ton solde après achat</dt>
          <dd className="text-right tabular-nums">{formatCoins(balance - price)}</dd>
        </dl>
        {message && !message.ok && (
          <p role="alert" className="mt-3 text-danger">
            {message.text}
          </p>
        )}
      </Modal>
    </>
  );
}

export function CancelListingButton({ listingId, onDone }: { listingId: string; onDone?: (ok: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cancelListing(listingId);
            if (!r.ok) setError(r.message);
            onDone?.(r.ok);
            router.refresh();
          })
        }
      >
        {pending ? "Retrait…" : "Retirer"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
