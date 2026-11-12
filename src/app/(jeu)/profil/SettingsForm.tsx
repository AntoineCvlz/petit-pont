"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { updateSetting, updateUsername, type ActionResult } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

type Settings = { sound_enabled: boolean; reduced_motion: boolean; hide_activity: boolean };

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "sound_enabled", label: "Sons", hint: "Effets sonores (ouverture de boosters, révélations)." },
  { key: "reduced_motion", label: "Animations réduites", hint: "Coupe les animations et l'effet holographique." },
  { key: "hide_activity", label: "Masquer mon activité", hint: "Tes obtentions et ventes n'apparaissent plus dans le fil public." },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setOptimistic] = useOptimistic(initial, (s, patch: Partial<Settings>) => ({ ...s, ...patch }));
  const [, startTransition] = useTransition();

  function toggle(key: keyof Settings, value: boolean) {
    startTransition(async () => {
      setOptimistic({ [key]: value });
      await updateSetting(key, value);
    });
  }

  return (
    <ul className="divide-y divide-line">
      {ROWS.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-semibold">{row.label}</p>
            <p className="text-xs text-chalk-muted">{row.hint}</p>
          </div>
          <Toggle label={row.label} checked={settings[row.key]} onChange={(v) => toggle(row.key, v)} />
        </li>
      ))}
    </ul>
  );
}

export function UsernameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateUsername, { ok: true, message: null });
  return (
    <form action={action} className="space-y-3">
      <Field label="Pseudo" id="username" name="username" defaultValue={current} required minLength={3} maxLength={20} />
      {state.message && <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Changer de pseudo"}
      </Button>
    </form>
  );
}
