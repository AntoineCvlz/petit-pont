import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeRedirectPath } from "@/lib/validation";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

async function LoginWithRedirect({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const { suite } = await searchParams;
  return <LoginForm next={safeRedirectPath(suite)} />;
}

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase italic">Connexion</h1>
      <p className="mt-1 mb-5 text-sm text-chalk-muted">Content de te revoir. Tes cartes t&apos;attendent.</p>
      <Suspense fallback={<LoginForm next="/" />}>
        <LoginWithRedirect searchParams={searchParams} />
      </Suspense>
      <p className="mt-5 text-center text-sm text-chalk-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-turf hover:underline">
          Inscris-toi
        </Link>
      </p>
    </>
  );
}
