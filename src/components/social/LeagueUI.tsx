"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLeague, joinLeague, leaveLeague, startLeague, type SocialResult } from "@/lib/actions/social";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";

const input =
  "h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none";

export function LeagueForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<SocialResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<SocialResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok && r.id) router.push(`/ligues/${r.id}`);
      else router.refresh();
    });
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-sm font-semibold">Créer une ligue</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex. Ligue du bureau)"
            maxLength={40}
            className={input}
          />
          <Button size="sm" disabled={pending || name.trim().length < 3} onClick={() => run(() => createLeague(name))}>
            Créer
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">Rejoindre avec un code</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code à 6 caractères"
            maxLength={10}
            className={input}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || code.trim().length < 4}
            onClick={() => run(() => joinLeague(code))}
          >
            Rejoindre
          </Button>
        </div>
      </div>
      {result && !result.ok && <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}

export function LeagueOwnerActions({ leagueId, isOwner, canStart }: { leagueId: string; isOwner: boolean; canStart: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<SocialResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner && (
        <Button
          size="sm"
          disabled={pending || !canStart}
          onClick={() =>
            start(async () => {
              setResult(await startLeague(leagueId));
              router.refresh();
            })
          }
        >
          {canStart ? "Lancer la ligue" : "Lancer (3 joueurs minimum)"}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await leaveLeague(leagueId);
            setResult(r);
            if (r.ok) router.push("/ligues");
          })
        }
      >
        {isOwner ? "Dissoudre la ligue" : "Quitter la ligue"}
      </Button>
      {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
    </div>
  );
}
