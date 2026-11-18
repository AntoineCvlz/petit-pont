import { describe, expect, it } from "vitest";
import { matchClub, matchPlayer, selectTotw, type CatalogCard, type FdPerformer, type FdTeamWeek } from "@/lib/totw";

const psg = { code: "PSG", name: "Paris Saint-Germain", shortName: "Paris" };
const om = { code: "OM", name: "Olympique de Marseille", shortName: "Marseille" };
const card = (id: number, name: string, position: CatalogCard["position"], club: CatalogCard["club"], rating = 80, birthdate?: string): CatalogCard => ({
  templateId: id,
  rating,
  position,
  name,
  lastName: name.split(" ").at(-1),
  birthdate,
  club,
  league: "L1",
});

const cards: CatalogCard[] = [
  card(1, "Ousmane Dembélé", "ATT", psg, 90, "1997-05-15"),
  card(2, "Bradley Barcola", "ATT", psg, 84),
  card(3, "Vitinha", "MIL", psg, 87),
  card(4, "Gianluigi Donnarumma", "GB", psg, 88),
  card(5, "Marquinhos", "DEF", psg, 86),
  card(6, "Achraf Hakimi", "DEF", psg, 87),
  card(7, "Nuno Mendes", "DEF", psg, 85),
  card(8, "Mason Greenwood", "ATT", om, 83),
  card(9, "Leonardo Balerdi", "DEF", om, 80),
  card(10, "Geronimo Rulli", "GB", om, 82),
];

describe("équipe de la semaine", () => {
  it("rapproche clubs et joueurs réels du catalogue", () => {
    expect(matchClub({ id: 1, name: "Paris Saint-Germain FC", shortName: "PSG", tla: "PSG" }, "L1", [psg, om])).toBe("PSG");
    expect(matchClub({ id: 2, name: "Olympique de Marseille", shortName: "Marseille", tla: "MAR" }, "L1", [psg, om])).toBe("OM");
    const p: FdPerformer = { name: "Ousmane Dembélé", dateOfBirth: "1997-05-15", team: { id: 1, name: "PSG" }, competition: "FL1", goals: 1, assists: 0 };
    expect(matchPlayer(p, "PSG", cards)?.templateId).toBe(1);
  });

  it("choisit l'attaque sur les buts et la défense sur les clean sheets", () => {
    const performers: FdPerformer[] = [
      { name: "Mason Greenwood", team: { id: 2, name: "Olympique de Marseille" }, competition: "FL1", goals: 3, assists: 0 },
      { name: "Ousmane Dembélé", team: { id: 1, name: "Paris Saint-Germain FC", tla: "PSG" }, competition: "FL1", goals: 1, assists: 1 },
      { name: "Vitinha", team: { id: 1, name: "Paris Saint-Germain FC", tla: "PSG" }, competition: "FL1", goals: 0, assists: 2 },
    ];
    const teams: FdTeamWeek[] = [
      { team: { id: 1, name: "Paris Saint-Germain FC", tla: "PSG" }, competition: "FL1", played: 1, wins: 1, cleanSheets: 1, goalsAgainst: 0 },
      { team: { id: 2, name: "Olympique de Marseille" }, competition: "FL1", played: 1, wins: 1, cleanSheets: 0, goalsAgainst: 2 },
    ];
    const picks = selectTotw(performers, teams, cards);
    const ids = picks.map((p) => p.templateId);
    // Greenwood (3 buts) devant Dembélé
    expect(ids.indexOf(8)).toBeLessThan(ids.indexOf(1));
    expect(picks.find((p) => p.templateId === 8)?.reason).toBe("3 buts");
    expect(picks.find((p) => p.templateId === 3)?.reason).toBe("2 passes déc.");
    // Gardien et défenseurs du club au clean sheet, 2 par club au plus
    expect(picks.find((p) => p.position === "GB")?.templateId).toBe(4);
    // 2 défenseurs du PSG d'abord (2 par club), le 3e seulement faute d'autres défenseurs disponibles
    expect(picks.filter((p) => p.position === "DEF").length).toBe(4);
    expect(picks.filter((p) => p.position === "DEF")[0]!.reason).toContain("clean sheet");
    // Boosts bornés
    expect(picks.every((p) => p.boost >= 2 && p.boost <= 6)).toBe(true);
  });
});
