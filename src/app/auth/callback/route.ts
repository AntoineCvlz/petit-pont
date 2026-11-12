import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validation";

/** Retour de Discord : échange le code (PKCE) contre une session, puis entrée dans le jeu. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const origin = publicOrigin(request.headers);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeRedirectPath(searchParams.get("suite")), origin));
    }
  }
  const failure = new URL("/connexion", origin);
  failure.searchParams.set("erreur", searchParams.get("error") === "access_denied" ? "annule" : "discord");
  return NextResponse.redirect(failure);
}
