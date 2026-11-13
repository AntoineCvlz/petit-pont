"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { buyWithTokens, claimMission, type FarmResult } from "@/lib/actions/farm";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import type { Mission } from "@/lib/data/farm";

function MissionRow({ m, onClaim, pending }: { m: Mission; onClaim: (id: number) => void; pending: boolean }) {
  const done = m.progress >= m.target;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={clsx("text-sm", m.claimed && "text-chalk-faint line-through")}>
          {m.link && !done ? (
            <Link href={m.link} className="hover:underline">
              {m.title}
            </Link>
          ) : (
            m.title
          )}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-night-700" aria-hidden="true">
            <div className="h-full rounded-full bg-turf" style={{ width: `${Math.min(100, (100 * m.progress) / m.target)}%` }} />
          </div>
          <span className="text-xs text-chalk-muted tabular-nums">
            {Math.min(m.progress, m.target)}/{m.target}
          </span>
        </div>
      </div>
      {m.claimed ? (
        <span className="w-28 text-right text-xs text-success">Récupéré</span>
      ) : (
        <Button
          size="sm"
          className="w-28"
          disabled={!done || pending}
          onClick={() => onClaim(m.id)}
          variant={done ? "primary" : "ghost"}
        >
          +{m.tokens} jetons
        </Button>
      )}
    </li>
  );
}

export function MissionsBoard({ missions }: { missions: Mission[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FarmResult | null>(null);
  const claim = (id: number) =>
    start(async () => {
      setResult(await claimMission(id));
      router.refresh();
    });
  const groups: ["daily" | "weekly", string][] = [
    ["daily", "Du jour"],
    ["weekly", "De la semaine"],
  ];
  return (
    <div className="space-y-5">
      {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
      {groups.map(([period, label]) => (
        <section key={period}>
          <h2 className="font-display text-sm font-bold tracking-widest text-chalk-muted uppercase">{label}</h2>
          <ul className="divide-y divide-line">
            {missions
              .filter((m) => m.period === period)
              .map((m) => (
                <MissionRow key={m.id} m={m} onClaim={claim} pending={pending} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TokenShop({ tokens, shop }: { tokens: number; shop: { booster: string; name: string; cost: number }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FarmResult | null>(null);
  return (
    <div className="space-y-3">
      <p className="font-display text-3xl font-extrabold tabular-nums">
        {tokens} <span className="text-base font-semibold text-chalk-muted">jetons</span>
      </p>
      <ul className="space-y-2">
        {shop.map((s) => (
          <li key={s.booster} className="flex items-center justify-between gap-3 rounded-lg bg-night-900 px-3 py-2">
            <span className="text-sm font-semibold">{s.name}</span>
            <Button
              size="sm"
              disabled={pending || tokens < s.cost}
              onClick={() =>
                start(async () => {
                  setResult(await buyWithTokens(s.booster));
                  router.refresh();
                })
              }
            >
              {s.cost} jetons
            </Button>
          </li>
        ))}
      </ul>
      {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
    </div>
  );
}
