import { NextResponse, type NextRequest } from "next/server";
import {
  DISCORD_STATE_COOKIE,
  discordAvatarUrl,
  discordUserMetadata,
  isPlaceholderEmail,
  placeholderEmail,
  type DiscordUser,
} from "@/lib/discord-oauth";
import { publicOrigin } from "@/lib/origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation";

/**
 * Retour de Discord (scope « identify ») :
 * 1. vérifie l'état anti-CSRF, échange le code contre un jeton Discord et lit le profil (id, nom, avatar) ;
 * 2. retrouve le compte lié à cet identifiant Discord, ou le crée (adresse technique, jamais l'e-mail Discord) ;
 *    un ancien compte qui portait l'e-mail Discord le remplace par l'adresse technique ;
 * 3. ouvre la session Supabase côté serveur (lien de connexion à usage unique, vérifié aussitôt).
 */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request.headers);
  const params = request.nextUrl.searchParams;
  const fail = (code: "discord" | "annule") => {
    const r = NextResponse.redirect(new URL(`/connexion?erreur=${code}`, origin));
    r.cookies.delete({ name: DISCORD_STATE_COOKIE, path: "/auth/discord" });
    return r;
  };

  if (params.get("error")) return fail(params.get("error") === "access_denied" ? "annule" : "discord");

  let saved: { state?: string; suite?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(DISCORD_STATE_COOKIE)?.value ?? "{}");
  } catch {
    saved = {};
  }
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) return fail("discord");

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("discord");

  try {
    // 1. Jeton puis profil Discord
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: new URL("/auth/discord/callback", origin).toString(),
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) return fail("discord");
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return fail("discord");
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!meRes.ok) return fail("discord");
    const me = (await meRes.json()) as DiscordUser;
    if (!/^[0-9]{5,25}$/.test(me.id ?? "")) return fail("discord");

    // 2. Compte lié (ou création)
    const admin = createAdminClient();
    const email = placeholderEmail(me.id);
    const { data: found, error: findError } = await admin.rpc("discord_account", { p_discord_id: me.id });
    if (findError) throw findError;
    let userId = found?.[0]?.user_id ?? null;
    let loginEmail = found?.[0]?.email ?? email;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: discordUserMetadata(me),
        app_metadata: { provider: "discord", providers: ["discord"], discord_id: me.id },
      });
      if (error || !data.user) throw error ?? new Error("Création du compte impossible");
      userId = data.user.id;
      loginEmail = email;
    } else if (!isPlaceholderEmail(loginEmail)) {
      // Ancien compte (connexion Discord avec e-mail) : l'e-mail Discord n'est plus conservé
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        app_metadata: { discord_id: me.id },
      });
      if (!error) loginEmail = email;
    }
    await admin.rpc("discord_sync_avatar", { p_user: userId, p_avatar_url: discordAvatarUrl(me) });

    // 3. Session : lien à usage unique généré puis vérifié côté serveur (pose les cookies de session)
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: loginEmail });
    if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error("Lien de connexion indisponible");
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (verifyError) throw verifyError;
  } catch (e) {
    console.error("Connexion Discord :", e instanceof Error ? e.message : e);
    return fail("discord");
  }

  const r = NextResponse.redirect(new URL(safeRedirectPath(saved.suite ?? null), origin));
  r.cookies.delete({ name: DISCORD_STATE_COOKIE, path: "/auth/discord" });
  return r;
}
