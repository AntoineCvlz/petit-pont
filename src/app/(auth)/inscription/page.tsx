import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { emailLoginEnabled } from "@/lib/env";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Inscription" };

/** Inscription par e-mail : comptes de test en développement uniquement (sinon Discord). */
export default function InscriptionPage() {
  if (!emailLoginEnabled()) redirect("/connexion");
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase italic">Inscription</h1>
      <p className="mt-1 mb-5 text-sm text-chalk-muted">Choisis ton pseudo, ta collection commence ici.</p>
      <SignupForm />
      <p className="mt-5 text-center text-sm text-chalk-muted">
        Déjà inscrit·e ?{" "}
        <Link href="/connexion" className="font-semibold text-turf hover:underline">
          Connecte-toi
        </Link>
      </p>
    </>
  );
}
