"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  adjustCoins,
  giveBoosters,
  giveCards,
  removeCards,
  resetAccount,
  searchGiftTemplates,
  setBan,
  type AdminResult,
} from "@/lib/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { SelectField, TextField } from "@/components/admin/Fields";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { formatDate } from "@/lib/format";
import type { Rarity } from "@/lib/rarity";

const VIA_LABELS: Record<string, string> = {
  booster: "Booster",
  seed: "Dotation",
  market: "Marché",
  trade: "Échange",
  admin: "Cadeau admin",
};

function Result({ result }: { result: AdminResult | null }) {
  if (!result?.message) return null;
  return <FormMessage tone={result.ok ? "success" : "error"}>{result.message}</FormMessage>;
}

// --- Offrir ----------------------------------------------------------------------

export function GiveBoostersForm({ userId, boosters }: { userId: string; boosters: { id: number; name: string }[] }) {
  return (
    <AdminForm action={giveBoosters} submitLabel="Offrir">
      <input type="hidden" name="user_id" value={userId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
        <SelectField label="Booster" name="booster_id" required options={boosters.map((b) => ({ value: b.id, label: b.name }))} />
        <TextField label="Nombre" name="count" type="number" min={1} max={50} defaultValue={1} required />
      </div>
      <TextField
        label="Message (facultatif)"
        name="reason"
        maxLength={300}
        placeholder="Ex. : merci pour ton signalement de bug"
      />
    </AdminForm>
  );
}

export function GiveCardsForm({ userId }: { userId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number; label: string }[]>([]);
  const [searching, startSearch] = useTransition();
  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(() => {
      if (term.length < 2) setResults([]);
      else startSearch(async () => setResults(await searchGiftTemplates(term)));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <AdminForm action={giveCards} submitLabel="Offrir">
      <input type="hidden" name="user_id" value={userId} />
      <TextField
        label="Chercher un joueur"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex. : mbappe"
        hint={searching ? "Recherche…" : query.trim().length >= 2 && results.length === 0 ? "Aucune carte trouvée." : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
        <SelectField
          key={results.map((r) => r.id).join(",")}
          label="Carte"
          name="template_id"
          required
          options={results.map((t) => ({ value: t.id, label: t.label }))}
        />
        <TextField label="Exemplaires" name="count" type="number" min={1} max={20} defaultValue={1} required />
      </div>
      <TextField label="Message (facultatif)" name="reason" maxLength={300} />
    </AdminForm>
  );
}

export function CoinsForm({ userId }: { userId: string }) {
  return (
    <AdminForm action={adjustCoins} submitLabel="Appliquer">
      <input type="hidden" name="user_id" value={userId} />
      <TextField
        label="Montant"
        name="amount"
        type="number"
        min={-1000000}
        max={1000000}
        required
        hint="Positif pour offrir, négatif pour retirer (journalisé)."
      />
      <TextField label="Motif (facultatif)" name="reason" maxLength={300} />
    </AdminForm>
  );
}

// --- Actions sensibles (confirmation + motif) ----------------------------------------

function ConfirmWithReason({
  label,
  title,
  description,
  confirmLabel,
  variant = "danger",
  reasonRequired = false,
  disabled,
  run,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "secondary";
  reasonRequired?: boolean;
  disabled?: boolean;
  run: (reason: string) => Promise<AdminResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  return (
    <div className="space-y-2">
      <Button variant={variant} size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        {label}
      </Button>
      <Result result={result} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={variant}
              size="sm"
              disabled={pending || (reasonRequired && reason.trim().length < 3)}
              onClick={() =>
                start(async () => {
                  setResult(await run(reason));
                  setOpen(false);
                  setReason("");
                  router.refresh();
                })
              }
            >
              {pending ? "En cours…" : confirmLabel}
            </Button>
          </>
        }
      >
        <p className="mb-3">{description}</p>
        <TextField
          label={reasonRequired ? "Motif (visible par le joueur)" : "Motif (facultatif, visible par le joueur)"}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

export function AccountDangerZone({
  userId,
  username,
  banned,
  protectedAccount,
}: {
  userId: string;
  username: string;
  banned: boolean;
  protectedAccount: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ConfirmWithReason
        label="Réinitialiser le compte"
        title={`Réinitialiser ${username} ?`}
        description="Toutes ses cartes sont supprimées (annonces et échanges en cours annulés), ses albums, sa liste de souhaits et ses packs offerts non ouverts sont effacés, et son solde revient au solde de départ. Le pseudo et l'historique des pièces sont conservés. Action irréversible."
        confirmLabel="Réinitialiser"
        disabled={protectedAccount}
        run={(reason) => resetAccount(userId, reason)}
      />
      {banned ? (
        <ConfirmWithReason
          label="Lever le bannissement"
          title={`Débannir ${username} ?`}
          description="Le joueur pourra de nouveau se connecter avec Discord et jouer normalement."
          confirmLabel="Débannir"
          variant="secondary"
          run={(reason) => setBan(userId, false, reason)}
        />
      ) : (
        <ConfirmWithReason
          label="Bannir"
          title={`Bannir ${username} ?`}
          description="Connexion bloquée, sessions coupées, annonces et échanges en cours annulés. Ses cartes et son solde sont conservés (débannissement possible)."
          confirmLabel="Bannir"
          reasonRequired
          disabled={protectedAccount}
          run={(reason) => setBan(userId, true, reason)}
        />
      )}
      {protectedAccount && (
        <p className="text-xs text-chalk-faint">Compte administrateur : réinitialisation et bannissement impossibles.</p>
      )}
    </div>
  );
}

// --- Collection : sélection et retrait d'exemplaires ---------------------------------------

export type CopyRow = {
  id: string;
  serialNumber: number;
  obtainedVia: string;
  obtainedAt: string;
  isLocked: boolean;
  collectionNumber: number;
  playerName: string;
  edition: string;
  rarity: Rarity;
  maxSupply: number | null;
};

export function CopyManager({ copies }: { copies: CopyRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? copies.filter((c) => c.playerName.toLowerCase().includes(q) || c.edition.toLowerCase().includes(q)) : copies;
  }, [copies, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (copies.length === 0) return <p className="text-sm text-chalk-muted">Aucune carte.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer (joueur, édition)…"
          aria-label="Filtrer les exemplaires"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none"
        />
        <Button variant="danger" size="sm" disabled={selected.size === 0} onClick={() => setOpen(true)}>
          Retirer la sélection ({selected.size})
        </Button>
      </div>
      <Result result={result} />
      <div className="max-h-[480px] overflow-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-night-850 text-left text-xs text-chalk-faint uppercase">
            <tr>
              <th className="w-8 px-2 py-2">
                <span className="sr-only">Sélection</span>
              </th>
              <th className="px-2 py-2">Carte</th>
              <th className="px-2 py-2">Rareté</th>
              <th className="px-2 py-2">N°</th>
              <th className="hidden px-2 py-2 sm:table-cell">Origine</th>
              <th className="hidden px-2 py-2 md:table-cell">Obtenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? "bg-danger/10" : undefined}>
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    aria-label={`Sélectionner ${c.playerName} n°${c.serialNumber}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <span className="font-semibold">{c.playerName}</span> <span className="text-chalk-faint">· {c.edition}</span>
                  {c.isLocked && <span className="ml-1 text-xs text-coin">(engagée)</span>}
                </td>
                <td className="px-2 py-1.5">
                  <RarityBadge rarity={c.rarity} />
                </td>
                <td className="px-2 py-1.5 tabular-nums">
                  #{c.serialNumber}
                  {c.maxSupply ? `/${c.maxSupply}` : ""}
                </td>
                <td className="hidden px-2 py-1.5 text-chalk-muted sm:table-cell">
                  {VIA_LABELS[c.obtainedVia] ?? c.obtainedVia}
                </td>
                <td className="hidden px-2 py-1.5 text-chalk-muted md:table-cell">{formatDate(c.obtainedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Retirer ${selected.size} exemplaire${selected.size > 1 ? "s" : ""} ?`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removeCards([...selected], reason);
                  setResult(r);
                  if (r.ok) setSelected(new Set());
                  setOpen(false);
                  setReason("");
                  router.refresh();
                })
              }
            >
              {pending ? "Retrait…" : "Retirer définitivement"}
            </Button>
          </>
        }
      >
        <p className="mb-3">
          Les exemplaires sont supprimés ; une annonce ou un échange en attente qui les contient est annulé (les deux joueurs sont
          prévenus).
        </p>
        <TextField
          label="Motif (facultatif, visible par le joueur)"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
