import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AdminForm } from "@/components/admin/AdminForm";
import { CheckField, SelectField, TextField } from "@/components/admin/Fields";
import { buttonClasses } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { saveTemplate } from "@/lib/actions/admin";
import { getReferenceOptions, listAdminTemplates, requireAdmin } from "@/lib/data/admin";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Admin · Cartes" };

export default async function AdminCardsPage({ searchParams }: PageProps<"/admin/cartes">) {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const { id, q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const [templates, refs] = await Promise.all([listAdminTemplates(search), getReferenceOptions()]);
  const editing = id === "nouveau" ? null : templates.find((t) => String(t.id) === id) ?? null;
  const showForm = id === "nouveau" || editing;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <Panel
        title={`Cartes (${templates.length})`}
        action={
          <Link href="/admin/cartes?id=nouveau" className={buttonClasses("primary", "sm")}>
            Nouvelle
          </Link>
        }
      >
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={search} placeholder="Rechercher un joueur…" aria-label="Rechercher une carte" className="h-8 flex-1 rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm" />
          <button className={buttonClasses("secondary", "sm")}>Chercher</button>
        </form>
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/cartes?id=${t.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className={clsx("flex items-center gap-3 px-2 py-2 text-sm hover:bg-night-800", editing?.id === t.id && "bg-night-700", !t.is_active && "opacity-50")}
              >
                <span className="w-10 text-right font-display text-xs text-chalk-faint tabular-nums">{t.collection_number}</span>
                <span className="w-8 font-display font-bold tabular-nums">{t.rating}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{t.playerName}</span>
                  <span className="ml-2 text-xs text-chalk-faint">
                    {t.edition} · {t.season}
                  </span>
                </span>
                <RarityBadge rarity={t.rarity} />
                <span className="w-16 text-right text-xs text-chalk-muted tabular-nums">
                  {t.minted_count}
                  {t.max_supply ? `/${t.max_supply}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {showForm && (
        <Panel title={editing ? `Modifier : ${editing.playerName} (${editing.edition})` : "Nouvelle carte"}>
          <AdminForm key={editing?.id ?? "new"} action={saveTemplate}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <SelectField label="Joueur" name="player_id" defaultValue={editing?.player_id} required options={refs.players.map((p) => ({ value: p.id, label: p.display_name }))} />
            <SelectField label="Club" name="club_id" defaultValue={editing?.club_id ?? ""} emptyLabel="Sans club" options={refs.clubs.map((c) => ({ value: c.id, label: c.name }))} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Saison" name="season" defaultValue={editing?.season ?? "Saison 2026"} required maxLength={40} />
              <TextField label="Édition" name="edition" defaultValue={editing?.edition ?? "Base"} required maxLength={40} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Rareté" name="rarity" defaultValue={editing?.rarity ?? "commune"} required options={RARITIES.map((r) => ({ value: r, label: RARITY_LABELS[r] }))} />
              <TextField label="Note" name="rating" type="number" min={40} max={99} defaultValue={editing?.rating ?? 75} required />
            </div>
            <TextField
              label="Tirage limité"
              name="max_supply"
              type="number"
              min={Math.max(1, editing?.minted_count ?? 1)}
              defaultValue={editing?.max_supply ?? ""}
              hint={editing ? `Vide = illimité. Déjà édités : ${editing.minted_count} (minimum).` : "Vide = illimité."}
            />
            <TextField label="Image (URL)" name="image_url" type="url" defaultValue={editing?.image_url ?? ""} hint="Vide = silhouette illustrée." />
            <CheckField label="Active (tirable dans les boosters)" name="is_active" defaultChecked={editing?.is_active ?? true} />
            {editing && <p className="text-xs text-chalk-faint">Numéro de collection {editing.collection_number} · le compteur d&apos;exemplaires n&apos;est pas modifiable.</p>}
          </AdminForm>
        </Panel>
      )}
    </div>
  );
}
