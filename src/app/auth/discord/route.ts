import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation";

/**
 * Départ de la connexion Discord (OAuth, PKCE) : simple lien GET plutôt qu'une action serveur,
 * pour fonctionner même depuis une page chargée avant un déploiement (identifiants d'actions périmés).
 * Le vérificateur PKCE est posé en cookie, puis redirection vers Discord ; retour sur /auth/callback.
 */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request.headers);
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("suite", safeRedirectPath(request.nextUrl.searchParams.get("suite")));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: callback.toString(), scopes: "identify email", skipBrowserRedirect: true },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/connexion?erreur=discord", origin));
  return NextResponse.redirect(data.url);
}
