"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";

/** Formulaire d'administration : action serveur + message de retour + état d'envoi. */
export function AdminForm({
  action,
  children,
  submitLabel = "Enregistrer",
}: {
  action: (prev: AdminResult, fd: FormData) => Promise<AdminResult>;
  children: ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: true, message: null });
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.message && <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
