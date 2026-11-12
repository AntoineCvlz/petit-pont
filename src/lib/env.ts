export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquantes (voir .env.example).",
    );
  }
  return { url, key };
}

/**
 * Connexion par e-mail / mot de passe : réservée au développement local et aux comptes de test
 * (AUTH_EMAIL_LOGIN=true dans .env.local). En production, seule la connexion Discord est proposée,
 * et le fournisseur e-mail est désactivé côté serveur d'authentification.
 */
export function emailLoginEnabled(): boolean {
  return process.env.AUTH_EMAIL_LOGIN === "true";
}
