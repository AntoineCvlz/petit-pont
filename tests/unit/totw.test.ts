import { describe, expect, it } from "vitest";
import { matchClub, matchPlayer, selectTotw, type CatalogCard, type Performer, type TeamWeek } from "@/lib/totw";

const psg = { code: "PSG", name: "Paris Saint-Germain", shortName: "Paris" };
const om = { code: "OM", name: "Olympique de Marseille", shortName: "Marseille" };
const city = { code: "MCI", name: "Manchester City", shortName: "Man City" };
const card = (
  id: number,
  name: string,
  position: CatalogCard["position"],
  club: CatalogCard["club"],
  nation: string,
  rating = 80,
  league = "L1",
): CatalogCard => ({ templateId: id, rating, position, name, lastName: name.split(" ").at(-1), club, league, nation });

const cards: CatalogCard[] = [
  card(1, "Ousmane Dembélé", "ATT", psg, "FRA", 90),
  card(2, "Bradley Barcola", "ATT", psg, "FRA", 84),
  card(3, "Vitinha", "MIL", psg, "POR", 87),
  card(4, "Gianluigi Donnarumma", "GB", psg, "ITA", 88),
  card(5, "Marquinhos", "DEF", psg, "BRA", 86),
  card(6, "Achraf Hakimi", "DEF", psg, "MAR", 87),
  card(7, "Nuno Mendes", "DEF", psg, "POR", 85),
  card(8, "Mason Greenwood", "ATT", om, "JAM", 83),
  card(9, "Leonardo Balerdi", "DEF", om, "ARG", 80),
  card(10, "Geronimo Rulli", "GB", om, "ARG", 82),
  card(11, "Erling Haaland", "ATT", city, "NOR", 91, "PL"),
];
const club = (league: string | null = "L1") => ({ kind: "club" as const, league });
const nation = (code: string) => ({ kind: "nation" as const, code });

describe("équipe de la semaine", () => {
  it("rapproche clubs et joueurs réels du catalogue", () => {
    expect(matchClub({ name: "Paris Saint-Germain FC", shortName: "PSG", tla: "PSG" }, [psg, om])).toBe("PSG");
    expect(matchClub({ name: "Olympique de Marseille", tla: "MAR" }, [psg, om])).toBe("OM");
    expect(matchPlayer({ name: "Ousmane Dembélé" }, cards.filter((c) => c.club.code === "PSG"))?.templateId).toBe(1);
    expect(matchPlayer({ name: "Erling Haaland" }, cards.filter((c) => c.nation === "NOR"))?.templateId).toBe(11);
  });

  it("compte les matchs internationaux (buts en sélection, clean sheets de la sélection)", () => {
    const performers: Performer[] = [
      { name: "Erling Haaland", team: { name: "Norway", tla: "NOR" }, scope: nation("NOR"), goals: 2, assists: 1 },
      { name: "Mason Greenwood", team: { name: "Olympique de Marseille" }, scope: club(), goals: 1, assists: 0 },
    ];
    const teams: TeamWeek[] = [
      { team: { name: "Argentina", tla: "ARG" }, scope: nation("ARG"), played: 2, wins: 2, cleanSheets: 2, goalsAgainst: 0 },
    ];
    const picks = selectTotw(performers, teams, cards);
    expect(picks[0]).toMatchObject({ templateId: 11, reason: "2 buts, 1 passe déc." });
    // Gardien argentin (2 clean sheets en sélection) alors que son club n'a pas joué
    expect(picks.find((p) => p.position === "GB")).toMatchObject({ templateId: 10, reason: "2 clean sheets, 2 victoires" });
  });

  it("choisit l'attaque sur les buts et la défense sur les clean sheets", () => {
    const performers: Performer[] = [
      { name: "Mason Greenwood", team: { name: "Olympique de Marseille" }, scope: club(), goals: 3, assists: 0 },
      { name: "Ousmane Dembélé", team: { name: "Paris Saint-Germain FC", tla: "PSG" }, scope: club(), goals: 1, assists: 1 },
      { name: "Vitinha", team: { name: "Paris Saint-Germain FC", tla: "PSG" }, scope: club(), goals: 0, assists: 2 },
    ];
    const teams: TeamWeek[] = [
      { team: { name: "Paris Saint-Germain FC", tla: "PSG" }, scope: club(), played: 1, wins: 1, cleanSheets: 1, goalsAgainst: 0 },
      { team: { name: "Olympique de Marseille" }, scope: club(), played: 1, wins: 1, cleanSheets: 0, goalsAgainst: 2 },
    ];
    const picks = selectTotw(performers, teams, cards);
    const ids = picks.map((p) => p.templateId);
    expect(ids.indexOf(8)).toBeLessThan(ids.indexOf(1));
    expect(picks.find((p) => p.templateId === 8)?.reason).toBe("3 buts");
    expect(picks.find((p) => p.templateId === 3)?.reason).toBe("2 passes déc.");
    expect(picks.find((p) => p.position === "GB")?.templateId).toBe(4);
    expect(picks.filter((p) => p.position === "DEF")[0]!.reason).toContain("clean sheet");
    expect(picks.every((p) => p.boost >= 2 && p.boost <= 6)).toBe(true);
  });
});
