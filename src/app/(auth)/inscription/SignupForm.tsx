"use client";

import { useActionState } from "react";
import { signUp, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, { error: null });
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Pseudo"
        id="username"
        name="username"
        autoComplete="username"
        required
        minLength={3}
        maxLength={20}
        pattern="[A-Za-z0-9_.\-]{3,20}"
        title="3 à 20 caractères : lettres, chiffres, « _ », « . » ou « - »"
        defaultValue={state.fields?.username}
      />
      <Field label="E-mail" id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      <Field label="Mot de passe" id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
      {state.error && <FormMessage>{state.error}</FormMessage>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
