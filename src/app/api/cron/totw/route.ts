import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/paginate";
import {
  FD_COMPETITIONS,
  selectTotw,
  type CatalogCard,
  type FdPerformer,
  type FdTeam,
  type FdTeamWeek,
} from "@/lib/totw";

/**
 * Équipe de la semaine (appelée par la tâche planifiée de la base, chaque mercredi 19h, jusqu'à publication).
 * Sans secret : la base n'accepte la publication que pour le créneau dû et une seule fois (totw_due / publish_totw),
 * et la route ne contacte football-data.org que si une publication est due.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FD = "https://api.football-data.org/v4";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FdMatch = {
  status: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
  goals?: { team: FdTeam; scorer?: { name: string } | null; assist?: { name: string } | null; type?: string }[];
};
type FdScorer = {
  player: { id: number; name: string; dateOfBirth?: string | null };
  team: FdTeam;
  goals: number | null;
  assists: number | null;
};

async function fd<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${FD}${path}`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
  if (!res.ok) throw new Error(`football-data ${path} : ${res.status}`);
  return (await res.json()) as T;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const frDay = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

async function run() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return NextResponse.json({ ok: false, reason: "FOOTBALL_DATA_TOKEN manquant" }, { status: 503 });
  const admin = createAdminClient();
  const { data: due, error: dueError } = await admin.rpc("totw_due");
  if (dueError) throw dueError;
  if (!due) return NextResponse.json({ ok: true, published: false, reason: "rien à publier" });

  const slot = new Date(due);
  const from = new Date(slot.getTime() - 7 * 86_400_000);

  // 1. Données réelles : matchs de la semaine et classements des buteurs (10 requêtes, 10/min autorisées)
  const performers: FdPerformer[] = [];
  const teamWeeks: FdTeamWeek[] = [];
  const snapshots: { competition: string; fd_player: number; goals: number; assists: number }[] = [];
  let first = true;
  for (const competition of Object.keys(FD_COMPETITIONS)) {
    if (!first) await sleep(6500);
    first = false;
    const { matches } = await fd<{ matches: FdMatch[] }>(
      `/competitions/${competition}/matches?status=FINISHED&dateFrom=${day(from)}&dateTo=${day(slot)}`,
      token,
    );
    await sleep(6500);
    const { scorers } = await fd<{ scorers: FdScorer[] }>(`/competitions/${competition}/scorers?limit=100`, token);

    // Résultats par équipe
    const byTeam = new Map<number, FdTeamWeek>();
    const goalEvents: Map<string, FdPerformer> = new Map();
    for (const m of matches) {
      const { home, away } = m.score.fullTime;
      if (home === null || away === null) continue;
      for (const [team, gf, ga] of [
        [m.homeTeam, home, away],
        [m.awayTeam, away, home],
      ] as const) {
        const w = byTeam.get(team.id) ?? { team, competition, played: 0, wins: 0, cleanSheets: 0, goalsAgainst: 0 };
        w.played += 1;
        w.wins += gf > ga ? 1 : 0;
        w.cleanSheets += ga === 0 ? 1 : 0;
        w.goalsAgainst += ga;
        byTeam.set(team.id, w);
      }
      // Détail des buts quand l'offre le fournit
      for (const g of m.goals ?? []) {
        if (g.type === "OWN") continue;
        for (const [who, kind] of [
          [g.scorer, "goals"],
          [g.assist, "assists"],
        ] as const) {
          if (!who?.name) continue;
          const key = `${g.team.id}|${who.name}`;
          const p = goalEvents.get(key) ?? { name: who.name, team: g.team, competition, goals: 0, assists: 0 };
          p[kind] += 1;
          goalEvents.set(key, p);
        }
      }
    }
    teamWeeks.push(...byTeam.values());

    if (goalEvents.size > 0) {
      // Dates de naissance prises dans le classement des buteurs quand le joueur y figure
      for (const p of goalEvents.values()) {
        p.dateOfBirth = scorers.find((s) => s.player.name === p.name)?.player.dateOfBirth ?? null;
        performers.push(p);
      }
    } else {
      // Sinon : buts / passes de la semaine = différence avec le relevé précédent du classement des buteurs
      const { data: prev } = await admin
        .from("totw_scorer_snapshots")
        .select("fd_player, goals, assists, taken_at")
        .eq("competition", competition)
        .order("taken_at", { ascending: false })
        .limit(500);
      const last = new Map<number, { goals: number; assists: number }>();
      for (const r of prev ?? []) if (!last.has(r.fd_player)) last.set(r.fd_player, r);
      const playedThisWeek = new Set([...byTeam.keys()]);
      for (const s of scorers) {
        const before = last.get(s.player.id);
        const goals = (s.goals ?? 0) - (before?.goals ?? (prev?.length ? (s.goals ?? 0) : 0));
        const assists = (s.assists ?? 0) - (before?.assists ?? (prev?.length ? (s.assists ?? 0) : 0));
        // Premier relevé (aucune base) : la semaine n'est pas mesurable ; on retient les buteurs dont l'équipe a joué
        const firstRun = !prev?.length;
        if (firstRun && !playedThisWeek.has(s.team.id)) continue;
        performers.push({
          name: s.player.name,
          dateOfBirth: s.player.dateOfBirth ?? null,
          team: s.team,
          competition,
          goals: firstRun ? Math.min(1, s.goals ?? 0) : Math.max(0, goals),
          assists: firstRun ? 0 : Math.max(0, assists),
        });
      }
    }
    for (const s of scorers) {
      snapshots.push({ competition, fd_player: s.player.id, goals: s.goals ?? 0, assists: s.assists ?? 0 });
    }
  }

  // 2. Catalogue : cartes de base des clubs des 5 grands championnats
  const { data: clubs, error: clubsError } = await admin
    .from("clubs")
    .select("id, code, name, short_name, leagues!inner ( code )")
    .in("leagues.code", Object.values(FD_COMPETITIONS));
  if (clubsError) throw clubsError;
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const rows = await fetchAll((a, b) =>
    admin
      .from("card_templates")
      .select("id, rating, club_id, players!inner ( display_name, first_name, last_name, birthdate, position )")
      .eq("edition", "Base")
      .eq("is_active", true)
      .in(
        "club_id",
        clubs.map((c) => c.id),
      )
      .order("id")
      .range(a, b),
  );
  const cards: CatalogCard[] = rows.map((r) => {
    const c = clubById.get(r.club_id!)!;
    return {
      templateId: r.id,
      rating: r.rating,
      position: r.players.position,
      name: r.players.display_name,
      firstName: r.players.first_name,
      lastName: r.players.last_name,
      birthdate: r.players.birthdate,
      club: { code: c.code, name: c.name, shortName: c.short_name },
      league: c.leagues.code,
    };
  });

  // 3. Sélection puis publication (la base revérifie le créneau)
  const picks = selectTotw(performers, teamWeeks, cards);
  const period = `${frDay(from)} au ${frDay(slot)}`;
  const { data: eventId, error } = await admin.rpc("publish_totw", {
    p_slot: due,
    p_period: period,
    p_picks: picks.map(({ templateId, boost, reason }) => ({ template_id: templateId, boost, reason })),
  });
  if (error) throw error;
  if (snapshots.length) await admin.from("totw_scorer_snapshots").insert(snapshots);
  return NextResponse.json({ ok: true, published: true, eventId, picks: picks.length });
}

export async function POST() {
  try {
    return await run();
  } catch (e) {
    console.error("Équipe de la semaine :", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
export const GET = POST;
