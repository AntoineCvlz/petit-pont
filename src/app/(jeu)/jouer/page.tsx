import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/layout/NavIcon";
import { PageHeader } from "@/components/ui/Panel";
import { getDraftStatus } from "@/lib/data/draft";
import { getMissionsStatus, getSbcList, getSeasonState } from "@/lib/data/farm";
import { getPenaltyStatus } from "@/lib/data/penalty";

export const metadata: Metadata = { title: "Jouer" };

type Mode = {
  href: string;
  title: string;
  pitch: string;
  status: string;
  highlight?: boolean;
  icon: "play" | "draft" | "penalty" | "album" | "trade";
};

export default async function PlayPage() {
  const [season, sbc, missions, draft, penalty] = await Promise.all([
    getSeasonState(),
    getSbcList(),
    getMissionsStatus(),
    getDraftStatus(),
    getPenaltyStatus(),
  ]);

  const claimable = missions.missions.filter((m) => m.progress >= m.target && !m.claimed).length;
  const run = season.run?.status === "active" ? season.run : null;
  const seasonLeft = season.dailyLimit - season.playedToday;
  const sbcOpen = sbc.filter((c) => c.available).length;

  const modes: Mode[] = [
    {
      href: "/saison",
      title: "Saison",
      icon: "play",
      pitch: "10 journées avec ton onze, deux tactiques par match. Paliers de points = packs.",
      status: !season.team?.complete
        ? "Compose ton onze pour commencer"
        : run
          ? `Saison ${run.number} · journée ${Math.min(run.matchday, 10)}/10 · ${run.points} pts · ${Math.max(0, seasonLeft)} match${seasonLeft > 1 ? "s" : ""} aujourd'hui`
          : "Prêt pour une nouvelle saison",
      highlight: Boolean(season.team?.complete) && seasonLeft > 0,
    },
    {
      href: "/defis",
      title: "Défis d'équipe",
      icon: "trade",
      pitch: "Échange des cartes (tes doublons !) contre des packs, en respectant les conditions.",
      status: `${sbcOpen} défi${sbcOpen > 1 ? "s" : ""} disponible${sbcOpen > 1 ? "s" : ""}`,
      highlight: sbcOpen > 0,
    },
    {
      href: "/missions",
      title: "Missions",
      icon: "album",
      pitch: "Objectifs du jour et de la semaine → jetons → packs.",
      status:
        claimable > 0
          ? `${claimable} récompense${claimable > 1 ? "s" : ""} à récupérer · ${missions.tokens} jetons`
          : `${missions.tokens} jetons`,
      highlight: claimable > 0,
    },
    {
      href: "/draft",
      title: "Draft",
      icon: "draft",
      pitch: "Onze tiré au sort dans tout le catalogue, classement sur la note et le collectif.",
      status: draft.active ? "Draft en cours" : `${draft.remaining}/${draft.dailyLimit} aujourd'hui`,
    },
    {
      href: "/penalty",
      title: "Tirs au but",
      icon: "penalty",
      pitch: "Quart, demie, finale contre l'ordinateur avec tes tireurs. Pièces à la clé.",
      status: penalty.active ? "Tournoi en cours" : `${penalty.remaining}/${penalty.dailyLimit} aujourd'hui`,
    },
  ];

  return (
    <>
      <PageHeader title="Jouer" subtitle="Modes de jeu : gagne des pièces et des packs en jouant." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modes.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="flex h-full flex-col gap-2 rounded-xl border border-line bg-night-850 p-4 transition-colors duration-150 hover:border-line-strong hover:bg-night-800"
            >
              <span className="flex items-center gap-2">
                <NavIcon name={m.icon} className="h-5 w-5 text-turf" />
                <span className="font-display text-lg font-extrabold tracking-wide uppercase">{m.title}</span>
              </span>
              <span className="text-sm text-chalk-muted">{m.pitch}</span>
              <span className={m.highlight ? "mt-auto text-sm font-semibold text-turf" : "mt-auto text-sm text-chalk-faint"}>
                {m.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
