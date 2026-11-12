"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimAlbumReward } from "@/lib/actions/albums";
import { formatCoins } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/CoinAmount";

export function ClaimRewardButton({ albumId, reward }: { albumId: number; reward: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function claim() {
    start(async () => {
      const r = await claimAlbumReward(albumId);
      if (r.ok) {
        setMessage({ ok: true, text: `Album bouclé ! +${formatCoins(r.reward)} pièces.` });
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.message });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!message?.ok && (
        <Button onClick={claim} disabled={pending}>
          {pending ? (
            "Réclamation…"
          ) : (
            <>
              Réclamer <CoinIcon /> {formatCoins(reward)}
            </>
          )}
        </Button>
      )}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm font-semibold text-success" : "text-sm text-danger"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
