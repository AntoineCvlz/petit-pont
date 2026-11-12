import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Compte suspendu" };

async function SuspendedNotice() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/connexion");
  if (!profile.bannedAt) redirect("/");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-danger/40 bg-night-850/95 p-6 text-center shadow-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase italic">
        Carton rouge
      </h1>
      <p className="mt-2 text-sm text-chalk-muted">
        Ton compte a été suspendu par l&apos;équipe de Petit Pont.
      </p>
      {profile.banReason && (
        <p className="mt-3 rounded-lg bg-night-900 px-3 py-2 text-sm">
          <span className="text-chalk-faint">Motif : </span>
          {profile.banReason}
        </p>
      )}
      <form action={signOut} className="mt-5">
        <Button type="submit" variant="secondary" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}

/** Page affichée à un joueur banni dont le jeton est encore valide (la base refuse déjà toute action). */
export default function SuspendedPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8 scale-125" />
      <Suspense fallback={null}>
        <SuspendedNotice />
      </Suspense>
    </main>
  );
}
