"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { claimDailyBonus } from "@/lib/actions/economy";
import { formatCoins } from "@/lib/format";
import { buttonClasses } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/CoinAmount";

/** Bouton de récupération du bonus quotidien (le serveur vérifie la date). */
export function DailyBonusButton({ amount, compact = false }: { amount: number; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function claim() {
    start(async () => {
      const r = await claimDailyBonus();
      setResult(r.ok ? { ok: true, text: `+${formatCoins(r.amount)} pièces, à demain !` } : { ok: false, text: r.message });
      router.refresh();
    });
  }

  if (result?.ok) {
    return compact ? null : (
      <p role="status" className="text-sm font-semibold text-success">
        {result.text}
      </p>
    );
  }

  return (
    <div className={clsx("flex items-center gap-3", compact && "contents")}>
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className={
          compact
            ? "flex items-center gap-1.5 rounded-lg border border-coin/50 bg-coin/10 px-2.5 py-1 text-sm font-semibold text-coin hover:bg-coin/20 disabled:opacity-60"
            : buttonClasses("primary", "md")
        }
        title="Bonus de connexion quotidien"
      >
        <CoinIcon />
        {pending ? "…" : compact ? `+${formatCoins(amount)}` : `Récupérer ${formatCoins(amount)} pièces`}
      </button>
      {result && !result.ok && (
        <p role="alert" className="text-sm text-danger">
          {result.text}
        </p>
      )}
    </div>
  );
}
