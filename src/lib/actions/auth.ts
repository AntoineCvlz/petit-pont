"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailLoginEnabled } from "@/lib/env";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { passwordError, safeRedirectPath, usernameFormatError } from "@/lib/validation";

export type FormState = { error: string | null; fields?: Record<string, string> };

const TOO_MANY = "Trop de tentatives d'affilée. Patiente quelques minutes avant de réessayer.";

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

const EMAIL_DISABLED = "La connexion se fait uniquement avec Discord.";

/** Connexion Discord (OAuth, PKCE) : redirige vers Discord, retour sur /auth/callback. */
export async function signInWithDiscord(formData: FormData): Promise<void> {
  const callback = new URL("/auth/callback", publicOrigin(await headers()));
  callback.searchParams.set("suite", safeRedirectPath(formData.get("suite")));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: callback.toString(), scopes: "identify email" },
  });
  if (error || !data.url) redirect("/connexion?erreur=discord");
  redirect(data.url);
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!emailLoginEnabled()) return { error: EMAIL_DISABLED };
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Renseigne ton e-mail et ton mot de passe.", fields: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: TOO_MANY, fields: { email } };
    return { error: "E-mail ou mot de passe incorrect.", fields: { email } };
  }
  redirect(safeRedirectPath(formData.get("suite")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!emailLoginEnabled()) return { error: EMAIL_DISABLED };
  const username = field(formData, "username");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const fields = { username, email };

  const formatError = usernameFormatError(username) ?? passwordError(password);
  if (formatError) return { error: formatError, fields };
  if (!email.includes("@")) return { error: "Adresse e-mail invalide.", fields };

  const supabase = await createClient();
  // Vérification serveur (format, mots interdits, unicité) avant de créer le compte
  const { data: problem, error: rpcError } = await supabase.rpc("username_problem", { p_username: username });
  if (rpcError) return { error: "Impossible de vérifier le pseudo, réessaie.", fields };
  if (problem) return { error: problem, fields };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    if (error.status === 429) return { error: TOO_MANY, fields };
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Un compte existe déjà avec cet e-mail.", fields };
    }
    return { error: "Inscription impossible pour le moment. Réessaie dans un instant.", fields };
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
