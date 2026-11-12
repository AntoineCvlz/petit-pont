import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormMessage } from "@/components/ui/Field";
import { emailLoginEnabled } from "@/lib/env";
import { safeRedirectPath } from "@/lib/validation";
import { DiscordButton } from "./DiscordButton";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  discord: "La connexion avec Discord a échoué. Réessaie dans un instant.",
  annule: "Connexion annulée depuis Discord.",
};

function LoginOptions({ next, error }: { next: string; error?: string }) {
  const withEmail = emailLoginEnabled();
  return (
    <>
      {error && (
        <div className="mb-4">
          <FormMessage>{error}</FormMessage>
        </div>
      )}
      <DiscordButton next={next} />
      <p className="mt-3 text-center text-xs text-chalk-faint">
        Première connexion ? Ton compte est créé automatiquement, avec ton pseudo Discord (modifiable ensuite).
      </p>
      {withEmail && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-chalk-faint" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            comptes de test (développement)
            <span className="h-px flex-1 bg-line" />
          </div>
          <LoginForm next={next} />
          <p className="mt-5 text-center text-sm text-chalk-muted">
            <Link href="/inscription" className="font-semibold text-turf hover:underline">
              Créer un compte de test
            </Link>
          </p>
        </>
      )}
    </>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const { suite, erreur } = await searchParams;
  return <LoginOptions next={safeRedirectPath(suite)} error={typeof erreur === "string" ? ERRORS[erreur] : undefined} />;
}

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase italic">Connexion</h1>
      <p className="mt-1 mb-5 text-sm text-chalk-muted">Tes cartes t&apos;attendent. Entre sur le terrain avec Discord.</p>
      <Suspense fallback={<LoginOptions next="/" />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </>
  );
}
