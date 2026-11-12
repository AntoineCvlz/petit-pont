"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, { error: null });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={next} />
      <Field label="E-mail" id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      <Field label="Mot de passe" id="password" name="password" type="password" autoComplete="current-password" required />
      {state.error && <FormMessage>{state.error}</FormMessage>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Entrer sur le terrain"}
      </Button>
    </form>
  );
}
