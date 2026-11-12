import { describe, expect, it } from "vitest";
import { formatCollectionNumber, formatRelative, formatSerial, initials } from "@/lib/format";
import { isActivePath, splitMobileNav, type NavItem } from "@/lib/navigation";
import { RARITIES, compareRarityDesc, hasShine, isPublicPull, rarityRank } from "@/lib/rarity";
import { passwordError, safeRedirectPath, usernameFormatError } from "@/lib/validation";

describe("raretés", () => {
  it("ordonne les six raretés de la spec", () => {
    expect(RARITIES).toEqual(["commune", "rare", "epique", "legendaire", "iconique", "speciale"]);
    expect(rarityRank("commune")).toBe(1);
    expect(rarityRank("speciale")).toBe(6);
  });

  it("applique la brillance à partir de Rare", () => {
    expect(hasShine("commune")).toBe(false);
    expect(hasShine("rare")).toBe(true);
    expect(hasShine("speciale")).toBe(true);
  });

  it("publie dans le fil à partir de Légendaire", () => {
    expect(isPublicPull("epique")).toBe(false);
    expect(isPublicPull("legendaire")).toBe(true);
    expect(isPublicPull("iconique")).toBe(true);
  });

  it("trie du plus rare au plus commun", () => {
    expect([...RARITIES].sort(compareRarityDesc)[0]).toBe("speciale");
  });
});

describe("formatage", () => {
  it("formate le numéro de collection", () => {
    expect(formatCollectionNumber(42, 250)).toBe("042/250");
    expect(formatCollectionNumber(7, 1200)).toBe("0007/1200");
  });

  it("formate le numéro de série", () => {
    expect(formatSerial(12, 50)).toBe("#12/50");
    expect(formatSerial(12, null)).toBe("#12");
  });

  it("donne des initiales", () => {
    expect(initials("Aile_de_pigeon")).toBe("AD");
    expect(initials("Panenka")).toBe("P");
  });

  it("formate une date relative", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(formatRelative("2026-11-12T11:59:30Z", now)).toBe("à l'instant");
    expect(formatRelative("2026-11-12T09:00:00Z", now)).toBe("il y a 3 heures");
    expect(formatRelative("2026-11-11T12:00:00Z", now)).toBe("hier");
  });
});

describe("validation", () => {
  it("valide le format du pseudo", () => {
    expect(usernameFormatError("Panenka")).toBeNull();
    expect(usernameFormatError("Reprise.de.volee")).toBeNull();
    expect(usernameFormatError("ab")).not.toBeNull();
    expect(usernameFormatError("avec espace")).not.toBeNull();
    expect(usernameFormatError("a".repeat(21))).not.toBeNull();
  });

  it("exige un mot de passe de 6 caractères", () => {
    expect(passwordError("12345")).not.toBeNull();
    expect(passwordError("123456")).toBeNull();
  });

  it("refuse les redirections externes", () => {
    expect(safeRedirectPath("/collection")).toBe("/collection");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
  });
});

describe("navigation", () => {
  const items = (n: number): NavItem[] =>
    Array.from({ length: n }, (_, i) => ({ href: `/p${i}`, label: `P${i}`, icon: "home" as const }));

  it("garde tout dans la barre mobile jusqu'à 5 entrées", () => {
    expect(splitMobileNav(items(5))).toEqual({ primary: items(5), more: [] });
  });

  it("passe en 4 entrées + « Plus » au-delà de 5", () => {
    const { primary, more } = splitMobileNav(items(9));
    expect(primary).toHaveLength(4);
    expect(more).toHaveLength(5);
  });

  it("détecte la page active", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/wiki/mbappe", "/wiki")).toBe(true);
    expect(isActivePath("/wiki", "/")).toBe(false);
    expect(isActivePath("/wikipedia", "/wiki")).toBe(false);
  });
});
