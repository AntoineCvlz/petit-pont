import { describe, expect, it } from "vitest";
import {
  discordAuthorizeUrl,
  discordAvatarUrl,
  discordUserMetadata,
  isPlaceholderEmail,
  placeholderEmail,
} from "@/lib/discord-oauth";

describe("connexion Discord (scope identify)", () => {
  it("ne demande jamais l'e-mail", () => {
    const url = new URL(discordAuthorizeUrl("123", "https://exemple.fr/auth/discord/callback", "etat"));
    expect(url.searchParams.get("scope")).toBe("identify");
    expect(url.searchParams.get("state")).toBe("etat");
    expect(url.toString()).not.toContain("email");
  });

  it("adresse technique non délivrable", () => {
    expect(placeholderEmail("123456789012345678")).toBe("discord-123456789012345678@users.petit-pont.invalid");
    expect(isPlaceholderEmail("discord-1@users.petit-pont.invalid")).toBe(true);
    expect(isPlaceholderEmail("joueur@gmail.com")).toBe(false);
    expect(() => placeholderEmail("abc")).toThrow();
  });

  it("avatar personnalisé ou avatar par défaut", () => {
    expect(discordAvatarUrl({ id: "123456789012345678", avatar: "a".repeat(32) })).toBe(
      `https://cdn.discordapp.com/avatars/123456789012345678/${"a".repeat(32)}.png`,
    );
    expect(discordAvatarUrl({ id: "123456789012345678", avatar: null })).toMatch(
      /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/,
    );
    // Valeur inattendue : jamais injectée telle quelle dans l'URL
    expect(discordAvatarUrl({ id: "123456789012345678", avatar: "../x" })).toContain("/embed/avatars/");
  });

  it("pseudo tiré du nom affiché, sinon de l'identifiant", () => {
    expect(discordUserMetadata({ id: "1", username: "zizou", global_name: "Zinédine", avatar: null }).full_name).toBe("Zinédine");
    expect(discordUserMetadata({ id: "1", username: "zizou", global_name: null, avatar: null }).full_name).toBe("zizou");
  });
});
