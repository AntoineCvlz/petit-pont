import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-turf italic">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold uppercase">Ballon sorti en touche</h1>
      <p className="mt-1 text-sm text-chalk-muted">Cette page n&apos;existe pas.</p>
      <Link href="/" className={buttonClasses("secondary", "md", "mt-6")}>
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
