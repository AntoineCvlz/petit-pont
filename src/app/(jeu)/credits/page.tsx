import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ui/Panel";
import rawCredits from "@/lib/media-credits.json";

type MediaCredits = {
  players: { slug: string; name: string; author: string; license: string; licenseUrl: string | null; source: string }[];
  clubs: { code: string; name: string; source: string }[];
};

/** Généré par scripts/media/build.mjs. */
const credits: MediaCredits = rawCredits;

export const metadata: Metadata = { title: "Crédits des images" };

const linkClass = "text-turf hover:underline";

export default function CreditsPage() {
  return (
    <>
      <PageHeader title="Crédits des images" subtitle="Photos et écussons utilisés sur les cartes" />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title={`Photos des joueurs (${credits.players.length})`}>
          <p className="mb-3 text-sm text-chalk-muted">
            Photos issues de Wikimedia Commons, publiées sous licence libre par leurs auteurs. Elles ont été détourées
            et recadrées pour les cartes ; ces adaptations sont diffusées sous la même licence.
          </p>
          <ul className="divide-y divide-line text-sm">
            {credits.players.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-baseline gap-x-2 py-1.5">
                <span className="font-semibold">{p.name}</span>
                <span className="text-chalk-muted">par {p.author}</span>
                <span className="text-chalk-faint">·</span>
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} className={linkClass} rel="license noreferrer" target="_blank">
                    {p.license}
                  </a>
                ) : (
                  <span>{p.license}</span>
                )}
                <span className="text-chalk-faint">·</span>
                <a href={p.source} className={linkClass} rel="noreferrer" target="_blank">
                  source
                </a>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Écussons des clubs (${credits.clubs.length})`}>
          <p className="mb-3 text-sm text-chalk-muted">
            Les écussons sont des marques appartenant à leurs clubs respectifs, reproduits ici à titre d&apos;illustration
            dans un jeu gratuit, sans lien avec les clubs. Fichiers issus de Wikipédia.
          </p>
          <ul className="divide-y divide-line text-sm">
            {credits.clubs.map((c) => (
              <li key={c.code} className="flex items-center gap-2 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- petit fichier statique */}
                <img src={`/media/clubs/${c.code}.webp`} alt="" className="h-5 w-5 object-contain" loading="lazy" />
                <span className="flex-1">{c.name}</span>
                <a href={c.source} className={linkClass} rel="noreferrer" target="_blank">
                  source
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
