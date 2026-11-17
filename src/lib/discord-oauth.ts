/**
 * Connexion Discord menée par l'application (scope « identify » seulement : identifiant, nom, avatar ; jamais l'e-mail).
 * Le compte Supabase reçoit une adresse technique non délivrable (domaine réservé .invalid).
 */

export const DISCORD_SCOPE = "identify";
export const DISCORD_STATE_COOKIE = "pp_discord_state";

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator?: string;
};

export function discordAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const u = new URL("https://discord.com/oauth2/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", DISCORD_SCOPE);
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "none");
  return u.toString();
}

/** Adresse technique du compte (jamais utilisée pour envoyer quoi que ce soit). */
export function placeholderEmail(discordId: string): string {
  if (!/^[0-9]{5,25}$/.test(discordId)) throw new Error("Identifiant Discord invalide");
  return `discord-${discordId}@users.petit-pont.invalid`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@users.petit-pont.invalid");
}

/** Avatar CDN Discord (format accepté par public._discord_avatar), ou avatar par défaut. */
export function discordAvatarUrl(u: Pick<DiscordUser, "id" | "avatar">): string {
  if (u.avatar && /^(a_)?[0-9a-f]{32}$/.test(u.avatar)) {
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`;
  }
  // Avatars par défaut (nouveau système de pseudos) : (id >> 22) % 6
  const index = Number((BigInt(u.id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** Métadonnées lues par public.handle_new_user pour choisir le pseudo (nom affiché, puis identifiant). */
export function discordUserMetadata(u: DiscordUser) {
  return {
    full_name: u.global_name ?? u.username,
    name: u.username,
    user_name: u.username,
    custom_claims: { global_name: u.global_name ?? u.username },
    avatar_url: discordAvatarUrl(u),
  };
}
