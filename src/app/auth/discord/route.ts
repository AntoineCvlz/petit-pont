import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DISCORD_STATE_COOKIE, discordAuthorizeUrl } from "@/lib/discord-oauth";
import { publicOrigin } from "@/lib/origin";
import { safeRedirectPath } from "@/lib/validation";

/**
 * Départ de la connexion Discord : simple lien GET (fonctionne même depuis une page chargée avant un déploiement).
 * OAuth mené par l'application avec le seul scope « identify » (pas d'accès à l'e-mail) ; l'état anti-CSRF et la
 * page de retour sont gardés dans un cookie httpOnly de courte durée. Retour sur /auth/discord/callback.
 */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request.headers);
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/connexion?erreur=discord", origin));

  const state = randomBytes(24).toString("base64url");
  const suite = safeRedirectPath(request.nextUrl.searchParams.get("suite"));
  const response = NextResponse.redirect(
    discordAuthorizeUrl(clientId, new URL("/auth/discord/callback", origin).toString(), state),
  );
  response.cookies.set(DISCORD_STATE_COOKIE, JSON.stringify({ state, suite }), {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/auth/discord",
    maxAge: 600,
  });
  return response;
}
