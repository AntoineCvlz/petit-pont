"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";

/** Erreur inattendue dans une page du jeu : message clair, réessai, retour à l'accueil. */
export default function GameError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-r-iconique italic">Faute !</p>
      <h1 className="mt-2 font-display text-2xl font-bold uppercase">Le ballon a heurté le poteau</h1>
      <p className="mt-1 max-w-md text-sm text-chalk-muted">
        Une erreur inattendue est survenue. Aucune action n&apos;a été validée à moitié : les opérations du jeu sont toutes
        atomiques.
      </p>
      {digest && <p className="mt-2 text-xs text-chalk-faint">Référence : {digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button onClick={() => retry()}>Réessayer</Button>
        <Link href="/" className={buttonClasses("secondary", "md")}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
