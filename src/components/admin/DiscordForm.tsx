"use client";

import { useActionState } from "react";
import { saveDiscordWebhook, type SocialResult } from "@/lib/actions/social";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";

const input =
  "h-9 w-full rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none";

/** Webhook du salon Discord des annonces (stocké côté serveur, jamais réaffiché). */
export function DiscordForm({ configured, siteUrl }: { configured: boolean; siteUrl: string }) {
  const [state, action, pending] = useActionState<SocialResult | null, FormData>(saveDiscordWebhook, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-chalk-muted">
        État : {configured ? <strong className="text-success">annonces actives</strong> : <strong>désactivées</strong>}. Discord →
        paramètres du salon → Intégrations → Webhooks → « Copier l&apos;URL ». Laisse vide pour désactiver.
      </p>
      <input
        name="webhook"
        type="url"
        placeholder="https://discord.com/api/webhooks/…"
        className={input}
        aria-label="URL du webhook Discord"
      />
      <input
        name="site_url"
        type="url"
        defaultValue={siteUrl}
        placeholder="https://petit-pont.example.fr"
        className={input}
        aria-label="URL publique du site"
      />
      {state && <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
