import { describe, expect, it } from "vitest";
import { formatMetric, parseMetric, parsePeriod, top10Label } from "@/lib/leaderboard";

describe("classements", () => {
  it("lit la métrique et la période", () => {
    expect(parseMetric("albums")).toBe("albums");
    expect(parseMetric("coins")).toBe("progression");
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod("year")).toBe("all");
  });

  it("formate les valeurs", () => {
    expect(formatMetric("progression", 12.5)).toBe("12,5 %");
    expect(formatMetric("rarity_score", 1240)).toMatch(/^1\s?240$/);
  });

  it("libellé du fil", () => {
    expect(top10Label("rarity_score")).toBe("score de rareté");
    expect(top10Label("hack")).toBe("classement");
  });
});
