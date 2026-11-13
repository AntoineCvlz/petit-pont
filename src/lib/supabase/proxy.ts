import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { supabaseEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/connexion", "/inscription"];
/** Retour OAuth : accessible connecté ou non (échange du code contre une session). */
const AUTH_CALLBACK = "/auth/callback";

/** Rafraîchit la session Supabase et protège les pages du jeu. */
export async function updateSession(request: NextRequest) {
  // Webhooks entrants (Discord) : pas de session utilisateur, authentifiés par leur propre signature
  if (request.nextUrl.pathname.startsWith("/api/discord/")) return NextResponse.next();
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  if (path === AUTH_CALLBACK) return response;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isAuthenticated && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/connexion";
    redirectUrl.search = path === "/" ? "" : `?suite=${encodeURIComponent(path)}`;
    return NextResponse.redirect(redirectUrl);
  }
  if (isAuthenticated && isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}
