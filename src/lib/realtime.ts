"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Abonnements Realtime partagés.
 *
 * Supabase Realtime identifie un abonnement postgres_changes par (table, événement, filtre, droits) :
 * deux canaux identiques sur la même connexion partagent le même abonnement serveur, et fermer
 * l'un coupe l'autre. C'est exactement ce qui se passe quand un composant est démonté puis remonté
 * (double montage de React en développement, navigation entre pages) : le nouveau canal se croit
 * abonné mais ne reçoit plus rien.
 *
 * On garde donc UN canal par flux, partagé par tous les composants qui l'écoutent, et sa fermeture
 * est différée : un remontage rapide réutilise le canal au lieu de le recréer.
 */

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
export type ChangeSpec = { table: string; event: ChangeEvent; filter?: string };
type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type Listener = (payload: Payload) => void;

type Entry = { channel: RealtimeChannel; listeners: Set<Listener>; closeTimer: ReturnType<typeof setTimeout> | null };

const registry = new Map<string, Entry>();
const CLOSE_DELAY_MS = 5_000;

let authReady: Promise<void> | null = null;

/** Transmet le jeton du joueur à Realtime (une fois ; supabase-js suit ensuite les rafraîchissements). */
function ensureRealtimeAuth(): Promise<void> {
  authReady ??= (async () => {
    const supabase = getBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
  })();
  return authReady;
}

export function changeKey(spec: ChangeSpec): string {
  return `${spec.table}:${spec.event}:${spec.filter ?? "*"}`;
}

export function subscribeToChanges(spec: ChangeSpec, listener: Listener): () => void {
  const key = changeKey(spec);
  let entry = registry.get(key);

  if (entry) {
    if (entry.closeTimer) {
      clearTimeout(entry.closeTimer);
      entry.closeTimer = null;
    }
  } else {
    const supabase = getBrowserClient();
    const listeners = new Set<Listener>();
    const channel = supabase.channel(`pp:${key}`).on(
      "postgres_changes" as never,
      { event: spec.event, schema: "public", table: spec.table, ...(spec.filter ? { filter: spec.filter } : {}) },
      (payload: Payload) => listeners.forEach((l) => l(payload)),
    );
    entry = { channel, listeners, closeTimer: null };
    registry.set(key, entry);
    // La session du client navigateur est initialisée paresseusement : sans elle, la connexion
    // Realtime part avec la seule clé publique et la RLS (auth.uid()) filtre tous les événements.
    void ensureRealtimeAuth().then(() => channel.subscribe());
  }

  const current = entry;
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0 && !current.closeTimer) {
      current.closeTimer = setTimeout(() => {
        if (current.listeners.size === 0) {
          registry.delete(key);
          void getBrowserClient().removeChannel(current.channel);
        }
        current.closeTimer = null;
      }, CLOSE_DELAY_MS);
    }
  };
}
