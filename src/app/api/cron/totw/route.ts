import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/paginate";
import { FD_COMPETITIONS, selectTotw, type CatalogCard, type Performer, type RealTeam, type Scope, type TeamWeek } from "@/lib/totw";

/**
 * Équipe de la semaine (appelée par la tâche planifiée de la base, chaque mercredi 19h, jusqu'à publication).
 * Fenêtre : matchs terminés entre les deux derniers mercredis 19h — championnats, coupes d'Europe et sélections
 * nationales (trêves internationales comprises).
 * Source principale : résultats publics d'ESPN (scores, buteurs, passeurs). Secours : football-data.org (championnats).
 * Sans secret : la base n'accepte la publication que pour le créneau dû et une seule fois (totw_due / publish_totw),
 * et la route ne contacte les sources que si une publication est due.
 */
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frDay = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

type Collected = { performers: Performer[]; teams: TeamWeek[] };

// --- ESPN ------------------------------------------------------------------------------------------------------
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
/** Compétitions suivies : clubs (ligue du catalogue si connue) et sélections. Une ligue absente est ignorée. */
const ESPN_CLUBS: Record<string, string | null> = {
  "fra.1": "L1",
  "eng.1": "PL",
  "esp.1": "LL",
  "ita.1": "SA",
  "ger.1": "BL",
  "uefa.champions": null,
  "uefa.europa": null,
  "uefa.europa.conf": null,
};
const ESPN_NATIONS = [
  "uefa.nations",
  "fifa.friendly",
  "uefa.euroq",
  "fifa.worldq.uefa",
  "fifa.worldq.conmebol",
  "fifa.worldq.concacaf",
  "fifa.worldq.caf",
  "fifa.worldq.afc",
  "concacaf.nations.league",
  "caf.nations_qual",
];

type EspnTeam = { id: string; displayName: string; shortDisplayName?: string; abbreviation?: string };
type EspnEvent = {
  id: string;
  date: string;
  competitions: {
    status: { type: { completed: boolean } };
    competitors: { team: EspnTeam; score: string }[];
  }[];
};
type EspnKeyEvent = {
  scoringPlay?: boolean;
  type?: { text?: string };
  team?: { id?: string };
  participants?: { athlete?: { displayName?: string } }[];
};

async function espn<T>(path: string): Promise<T | null> {
  const res = await fetch(`${ESPN}/${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function collectEspn(from: Date, to: Date): Promise<Collected> {
  const performers: Performer[] = [];
  const teams: TeamWeek[] = [];
  const days: string[] = [];
  for (let t = from.getTime() - 86_400_000; t <= to.getTime() + 86_400_000; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, ""));
  }
  const seen = new Set<string>();
  const slugs: [string, Scope | "nation"][] = [
    ...Object.entries(ESPN_CLUBS).map(([s, league]) => [s, { kind: "club", league }] as [string, Scope]),
    ...ESPN_NATIONS.map((s) => [s, "nation"] as [string, "nation"]),
  ];
  for (const [slug, scopeOf] of slugs) {
    for (const day of days) {
      const board = await espn<{ events?: EspnEvent[] }>(`${slug}/scoreboard?dates=${day}`);
      await sleep(120);
      for (const e of board?.events ?? []) {
        const when = new Date(e.date);
        const c = e.competitions[0];
        if (!c?.status.type.completed || when < from || when > to || seen.has(e.id)) continue;
        seen.add(e.id);
        const scopeFor = (t: EspnTeam): Scope =>
          scopeOf === "nation" ? { kind: "nation", code: (t.abbreviation ?? "").toUpperCase() } : scopeOf;
        const realTeam = (t: EspnTeam): RealTeam => ({ name: t.displayName, shortName: t.shortDisplayName, tla: t.abbreviation });
        const [a, b] = c.competitors;
        if (!a || !b) continue;
        for (const [me, other] of [
          [a, b],
          [b, a],
        ] as const) {
          const gf = Number(me.score);
          const ga = Number(other.score);
          if (!Number.isFinite(gf) || !Number.isFinite(ga)) continue;
          teams.push({
            team: realTeam(me.team),
            scope: scopeFor(me.team),
            played: 1,
            wins: gf > ga ? 1 : 0,
            cleanSheets: ga === 0 ? 1 : 0,
            goalsAgainst: ga,
          });
        }
        if (Number(a.score) + Number(b.score) === 0) continue;
        // Buteurs et passeurs (le résumé du match donne le passeur en second participant)
        const summary = await espn<{ keyEvents?: EspnKeyEvent[] }>(`${slug}/summary?event=${e.id}`);
        await sleep(120);
        for (const k of summary?.keyEvents ?? []) {
          if (!k.scoringPlay || /own goal/i.test(k.type?.text ?? "")) continue;
          const team = [a, b].find((x) => x.team.id === k.team?.id)?.team;
          if (!team) continue;
          const [scorer, assist] = k.participants ?? [];
          for (const [who, kind] of [
            [scorer, "goals"],
            [assist, "assists"],
          ] as const) {
            const name = who?.athlete?.displayName;
            if (!name) continue;
            performers.push({
              name,
              team: realTeam(team),
              scope: scopeFor(team),
              goals: kind === "goals" ? 1 : 0,
              assists: kind === "assists" ? 1 : 0,
            });
          }
        }
      }
    }
  }
  return { performers, teams };
}

// --- football-data.org (secours : championnats, buts de la semaine par différence de relevés) --------------------
type FdTeam = { id: number; name: string; shortName?: string | null; tla?: string | null };
type FdMatch = { homeTeam: FdTeam; awayTeam: FdTeam; score: { fullTime: { home: number | null; away: number | null } } };
type FdScorer = { player: { id: number; name: string; dateOfBirth?: string | null }; team: FdTeam; goals: number | null; assists: number | null };

async function collectFootballData(from: Date, to: Date): Promise<Collected & { snapshots: Record<string, unknown>[] }> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN manquant");
  const fd = async <T,>(path: string): Promise<T> => {
    const res = await fetch(`https://api.football-data.org/v4${path}`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
    if (!res.ok) throw new Error(`football-data ${path} : ${res.status}`);
    return (await res.json()) as T;
  };
  const admin = createAdminClient();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const performers: Performer[] = [];
  const teams: TeamWeek[] = [];
  const snapshots: Record<string, unknown>[] = [];
  for (const [competition, league] of Object.entries(FD_COMPETITIONS)) {
    const scope: Scope = { kind: "club", league };
    const { matches } = await fd<{ matches: FdMatch[] }>(
      `/competitions/${competition}/matches?status=FINISHED&dateFrom=${day(from)}&dateTo=${day(to)}`,
    );
    await sleep(6500);
    const { scorers } = await fd<{ scorers: FdScorer[] }>(`/competitions/${competition}/scorers?limit=100`);
    await sleep(6500);
    for (const m of matches) {
      const { home, away } = m.score.fullTime;
      if (home === null || away === null) continue;
      for (const [t, gf, ga] of [
        [m.homeTeam, home, away],
        [m.awayTeam, away, home],
      ] as const) {
        teams.push({ team: t, scope, played: 1, wins: gf > ga ? 1 : 0, cleanSheets: ga === 0 ? 1 : 0, goalsAgainst: ga });
      }
    }
    const { data: prev } = await admin
      .from("totw_scorer_snapshots")
      .select("fd_player, goals, assists")
      .eq("competition", competition)
      .order("taken_at", { ascending: false })
      .limit(500);
    const last = new Map<number, { goals: number; assists: number }>();
    for (const r of prev ?? []) if (!last.has(r.fd_player)) last.set(r.fd_player, r);
    for (const s of scorers) {
      const before = last.get(s.player.id);
      if (before) {
        performers.push({
          name: s.player.name,
          dateOfBirth: s.player.dateOfBirth,
          team: s.team,
          scope,
          goals: Math.max(0, (s.goals ?? 0) - before.goals),
          assists: Math.max(0, (s.assists ?? 0) - before.assists),
        });
      }
      snapshots.push({ competition, fd_player: s.player.id, goals: s.goals ?? 0, assists: s.assists ?? 0 });
    }
  }
  return { performers, teams, snapshots };
}

// --- Route ---------------------------------------------------------------------------------------------------------
async function run() {
  const admin = createAdminClient();
  const { data: due, error: dueError } = await admin.rpc("totw_due");
  if (dueError) throw dueError;
  if (!due) return NextResponse.json({ ok: true, published: false, reason: "rien à publier" });

  const slot = new Date(due);
  const from = new Date(slot.getTime() - 7 * 86_400_000);

  let data: Collected;
  let snapshots: Record<string, unknown>[] = [];
  let source = "espn";
  try {
    data = await collectEspn(from, slot);
    if (data.teams.length === 0) throw new Error("aucun match ESPN");
  } catch (e) {
    console.warn("Équipe de la semaine : ESPN indisponible, secours football-data.org :", e instanceof Error ? e.message : e);
    const fd = await collectFootballData(from, slot);
    data = fd;
    snapshots = fd.snapshots;
    source = "football-data";
  }

  // Catalogue : toutes les cartes de base actives (club, ligue, nation)
  const rows = await fetchAll((a, b) =>
    admin
      .from("card_templates")
      .select(
        "id, rating, players!inner ( display_name, first_name, last_name, birthdate, position, nations!inner ( code ) ), clubs!inner ( code, name, short_name, leagues ( code ) )",
      )
      .eq("edition", "Base")
      .eq("is_active", true)
      .order("id")
      .range(a, b),
  );
  const cards: CatalogCard[] = rows.map((r) => ({
    templateId: r.id,
    rating: r.rating,
    position: r.players.position,
    name: r.players.display_name,
    firstName: r.players.first_name,
    lastName: r.players.last_name,
    birthdate: r.players.birthdate,
    club: { code: r.clubs.code, name: r.clubs.name, shortName: r.clubs.short_name },
    league: r.clubs.leagues?.code ?? null,
    nation: r.players.nations.code,
  }));

  const picks = selectTotw(data.performers, data.teams, cards);
  const { data: eventId, error } = await admin.rpc("publish_totw", {
    p_slot: due,
    p_period: `${frDay(from)} au ${frDay(slot)}`,
    p_picks: picks.map(({ templateId, boost, reason }) => ({ template_id: templateId, boost, reason })),
  });
  if (error) throw error;
  if (snapshots.length) await admin.from("totw_scorer_snapshots").insert(snapshots as never);
  return NextResponse.json({ ok: true, published: true, eventId, source, picks: picks.length });
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
