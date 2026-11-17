import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase avec la clé de service (contourne la RLS) : réservé à la route de retour de la connexion Discord
 * (création du compte et ouverture de session). Jamais importé côté navigateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY manquante : connexion Discord indisponible.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
