"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import {
  createClan,
  deleteClanMessage,
  joinClan,
  kickClanMember,
  leaveClan,
  postClanMessage,
  updateClan,
  type SocialResult,
} from "@/lib/actions/social";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import type { ClanMessage } from "@/lib/data/social";
import { formatRelative } from "@/lib/format";
import { subscribeToChanges } from "@/lib/realtime";

const input =
  "h-9 w-full min-w-0 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none";

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<SocialResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<SocialResult>, goTo?: (r: SocialResult) => string | null) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      const dest = goTo?.(r);
      if (dest) router.push(dest);
      else router.refresh();
    });
  return { result, pending, run };
}

export function CreateClanForm() {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(true);
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du clan"
          maxLength={30}
          className={input}
          aria-label="Nom du clan"
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="Sigle"
          maxLength={4}
          className={input}
          aria-label="Sigle (2 à 4 caractères)"
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (facultatif)"
        maxLength={200}
        className={input}
        aria-label="Description"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Ouvert à tous (sinon sur invitation)
      </label>
      {result && !result.ok && <FormMessage>{result.message}</FormMessage>}
      <Button
        size="sm"
        disabled={pending || name.trim().length < 3 || tag.length < 2}
        onClick={() =>
          run(
            () => createClan(name, tag, description, open),
            (r) => (r.ok && r.id ? `/clans/${r.id}` : null),
          )
        }
      >
        Créer le clan
      </Button>
    </div>
  );
}

export function JoinClanByCode() {
  const [code, setCode] = useState("");
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Code d'invitation"
          maxLength={10}
          className={input}
          aria-label="Code d'invitation"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || code.trim().length < 4}
          onClick={() =>
            run(
              () => joinClan(null, code),
              (r) => (r.ok && r.id ? `/clans/${r.id}` : null),
            )
          }
        >
          Rejoindre
        </Button>
      </div>
      {result && !result.ok && <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}

export function JoinOpenClanButton({ clanId }: { clanId: string }) {
  const { result, pending, run } = useAction();
  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          run(
            () => joinClan(clanId, null),
            (r) => (r.ok && r.id ? `/clans/${r.id}` : null),
          )
        }
      >
        Rejoindre
      </Button>
      {result && !result.ok && <span className="text-xs text-danger">{result.message}</span>}
    </span>
  );
}

export function ClanAdmin({
  description,
  isOpen,
  inviteCode,
  isOwner,
}: {
  description: string | null;
  isOpen: boolean;
  inviteCode: string | null;
  isOwner: boolean;
}) {
  const [desc, setDesc] = useState(description ?? "");
  const [open, setOpen] = useState(isOpen);
  const { result, pending, run } = useAction();
  return (
    <div className="space-y-3 text-sm">
      {inviteCode && (
        <p>
          Code d&apos;invitation : <strong className="font-mono text-base">{inviteCode}</strong>
        </p>
      )}
      {isOwner && (
        <>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={200}
            className={input}
            aria-label="Description du clan"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Ouvert à tous
          </label>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => updateClan(desc, open))}>
            Enregistrer
          </Button>
        </>
      )}
      <div>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(
              () => leaveClan(),
              (r) => (r.ok ? "/clans" : null),
            )
          }
        >
          Quitter le clan
        </Button>
      </div>
      {result && <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>}
    </div>
  );
}

export function KickButton({ userId, username }: { userId: string; username: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      className="text-xs text-chalk-faint underline hover:text-danger"
      disabled={pending}
      aria-label={`Retirer ${username} du clan`}
      onClick={() => run(() => kickClanMember(userId))}
    >
      retirer
    </button>
  );
}

/** Discussion du clan : messages en temps réel (Supabase Realtime, filtrés par la RLS). */
export function ClanChat({
  clanId,
  meId,
  isOwner,
  initial,
  names,
}: {
  clanId: string;
  meId: string;
  isOwner: boolean;
  initial: ClanMessage[];
  names: Record<string, { username: string; avatarUrl: string | null }>;
}) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(
    () =>
      subscribeToChanges({ table: "clan_messages", event: "INSERT", filter: `clan_id=eq.${clanId}` }, (payload) => {
        const m = payload.new as { id: number; user_id: string | null; body: string; created_at: string };
        setMessages((prev) =>
          prev.some((x) => x.id === m.id)
            ? prev
            : [
                ...prev.slice(-99),
                {
                  id: m.id,
                  userId: m.user_id,
                  username: m.user_id ? (names[m.user_id]?.username ?? "?") : null,
                  avatarUrl: m.user_id ? (names[m.user_id]?.avatarUrl ?? null) : null,
                  body: m.body,
                  createdAt: m.created_at,
                },
              ],
        );
      }),
    [clanId, names],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  function send() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const r = await postClanMessage(text);
      if (!r.ok) setError(r.message);
      else setBody("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ol ref={listRef} className="max-h-[420px] min-h-40 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && <li className="text-sm text-chalk-muted">Aucun message. Lance la discussion !</li>}
        {messages.map((m) =>
          m.userId === null ? (
            <li key={m.id} className="text-center text-xs text-chalk-faint">
              {m.body}
            </li>
          ) : (
            <li key={m.id} className={clsx("flex gap-2", m.userId === meId && "flex-row-reverse")}>
              <Avatar name={m.username ?? "?"} url={m.avatarUrl} />
              <div
                className={clsx("max-w-[75%] rounded-xl px-3 py-1.5 text-sm", m.userId === meId ? "bg-turf/15" : "bg-night-800")}
              >
                <p className="text-xs text-chalk-faint">
                  {m.username} · {formatRelative(m.createdAt)}
                  {(m.userId === meId || isOwner) && (
                    <button
                      type="button"
                      className="ml-2 underline hover:text-danger"
                      aria-label="Supprimer le message"
                      onClick={() =>
                        start(async () => {
                          const r = await deleteClanMessage(m.id);
                          if (r.ok) setMessages((prev) => prev.filter((x) => x.id !== m.id));
                        })
                      }
                    >
                      suppr.
                    </button>
                  )}
                </p>
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
              </div>
            </li>
          ),
        )}
      </ol>
      {error && <FormMessage>{error}</FormMessage>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="Écris au clan…"
          className={input}
          aria-label="Message au clan"
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
