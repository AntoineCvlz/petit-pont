import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error("Les tests d'intégration ne tournent que sur la base locale.");
}

/** Client administrateur (clé secrète) : préparation des données de test uniquement. */
export const admin: SupabaseClient<Database> = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type TestPlayer = { id: string; username: string; client: SupabaseClient<Database> };

/** Crée un vrai compte (via l'API d'auth) et renvoie un client connecté avec. */
export async function createPlayer(prefix: string): Promise<TestPlayer> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const username = `${prefix}${suffix}`.slice(0, 20);
  const email = `${username.toLowerCase()}@integration.test`;
  const password = "integration-pass";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw error;

  const client = createClient<Database>(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, username, client };
}

// Les comptes de test ne sont pas supprimés : le journal des pièces est immuable.
// `supabase db reset` remet la base au propre.

export async function boosterId(slug: string): Promise<number> {
  const { data, error } = await admin.from("boosters").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id;
}

export async function coins(userId: string): Promise<number> {
  const { data, error } = await admin.from("profiles").select("coins").eq("id", userId).single();
  if (error) throw error;
  return data.coins;
}
