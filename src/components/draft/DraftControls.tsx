"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { abandonDraft, pickDraft, startDraft } from "@/lib/actions/draft";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { CardTemplateView } from "@/lib/data/cards";
import type { DraftFormation } from "@/lib/draft";

/** Les 5 cartes proposées pour le poste en cours : un clic = un choix (validé par la base). */
export function DraftOffer({
  draftId,
  slotLabel,
  step,
  offer,
  collectionTotal,
}: {
  draftId: string;
  slotLabel: string;
  step: number;
  offer: CardTemplateView[];
  collectionTotal: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  function choose(index: number) {
    if (pending) return;
    setChosen(index);
    setError(null);
    start(async () => {
      const r = await pickDraft(draftId, index + 1);
      if (!r.ok) {
        setError(r.message);
        setChosen(null);
        router.refresh();
        return;
      }
      if (r.completed) router.push(`/draft/${draftId}`);
      else router.refresh();
      setChosen(null);
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold tracking-wide uppercase">
          Choix {step}/11 · <span className="text-turf">{slotLabel}</span>
        </h2>
        <button
          type="button"
          onClick={() => setConfirmAbandon(true)}
          className="text-xs text-chalk-faint underline hover:text-chalk"
        >
          Abandonner
        </button>
      </div>
      {error && (
        <div className="mb-3">
          <FormMessage>{error}</FormMessage>
        </div>
      )}
      <ul className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 2xl:grid-cols-5">
        {offer.map((t, i) => (
          <li key={`${step}-${t.id}`}>
            <button
              type="button"
              onClick={() => choose(i)}
              disabled={pending}
              aria-label={`Choisir ${t.playerName}, note ${t.rating}`}
              className={clsx(
                "rounded-[14px] transition-transform duration-150 enabled:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turf",
                pending && chosen !== i && "opacity-40",
              )}
            >
              <Card template={t} collectionTotal={collectionTotal} size="sm" interactive={false} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-chalk-faint">
        Astuce : un lien vert (même club, ou même ligue et même nation) vaut plus qu&apos;une note un peu plus haute.
      </p>

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Abandonner ce draft ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAbandon(false)}>
              Continuer
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await abandonDraft(draftId);
                  setConfirmAbandon(false);
                  if (!r.ok) setError(r.message);
                  router.refresh();
                })
              }
            >
              Abandonner
            </Button>
          </>
        }
      >
        <p>L&apos;équipe ne sera pas classée et ce draft compte dans ta limite du jour.</p>
      </Modal>
    </div>
  );
}

/** Choix de la formation et lancement d'un draft. */
export function DraftStart({ formations, remaining }: { formations: DraftFormation[]; remaining: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(formations[0]?.code ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm text-chalk-muted">Choisis ta formation</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {formations.map((f) => (
            <label
              key={f.code}
              className={clsx(
                "cursor-pointer rounded-xl border p-2 text-center transition-colors duration-150",
                selected === f.code ? "border-turf bg-turf/10" : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="formation"
                value={f.code}
                checked={selected === f.code}
                onChange={() => setSelected(f.code)}
                className="sr-only"
              />
              <svg viewBox="0 0 100 100" className="mx-auto h-20 w-16 rounded bg-[#1d5a35]" aria-hidden="true">
                {f.links.map(([a, b]) => {
                  const sa = f.slots.find((s) => s.key === a)!;
                  const sb = f.slots.find((s) => s.key === b)!;
                  return (
                    <line key={a + b} x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                  );
                })}
                {f.slots.map((s) => (
                  <circle key={s.key} cx={s.x} cy={s.y} r="5" fill="#e8efe9" />
                ))}
              </svg>
              <span className="mt-1 block font-display font-extrabold tracking-wide">{f.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <div className="mt-3">
          <FormMessage>{error}</FormMessage>
        </div>
      )}
      <Button
        className="mt-4 w-full sm:w-auto"
        disabled={pending || remaining === 0 || !selected}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await startDraft(selected);
            if (!r.ok) setError(r.message);
            router.refresh();
          })
        }
      >
        {remaining === 0 ? "Plus de draft aujourd'hui" : pending ? "Tirage…" : "Lancer le draft"}
      </Button>
    </div>
  );
}
