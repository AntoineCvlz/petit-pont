"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createListing } from "@/lib/actions/market";
import { formatCoins } from "@/lib/format";
import { marketFee } from "@/lib/market";
import { Button } from "@/components/ui/Button";

/** Mise en vente d'un exemplaire libre à prix fixe (validation définitive côté serveur). */
export function SellForm({
  copies,
  suggested,
  feePercent,
  systemPrice,
}: {
  copies: { id: string; label: string }[];
  suggested: number;
  feePercent: number;
  systemPrice: number;
}) {
  const router = useRouter();
  const [instanceId, setInstanceId] = useState(copies[0]?.id ?? "");
  const [price, setPrice] = useState(String(suggested));
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (copies.length === 0) return <p className="text-sm text-chalk-muted">Tous tes exemplaires sont déjà engagés.</p>;

  const value = Number.parseInt(price, 10);
  const valid = Number.isInteger(value) && value >= 1 && value <= 1_000_000;
  const fee = valid ? marketFee(value, feePercent) : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(async () => {
      const r = await createListing(instanceId, value);
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Exemplaire</span>
          <select
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm text-chalk focus:border-turf focus:outline-none"
          >
            {copies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-chalk-muted uppercase">Prix (pièces)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000000}
            step={1}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm text-chalk focus:border-turf focus:outline-none"
          />
        </label>
      </div>
      <p className="text-xs text-chalk-muted">
        {valid ? (
          <>
            Tu toucheras <span className="font-semibold text-coin">{formatCoins(value - fee)}</span> pièces (commission de {feePercent} % :{" "}
            {formatCoins(fee)}).{" "}
          </>
        ) : (
          "Prix entre 1 et 1 000 000 pièces. "
        )}
        Revente au système : {formatCoins(systemPrice)}.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || !valid}>
          {pending ? "Mise en vente…" : "Mettre en vente"}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
