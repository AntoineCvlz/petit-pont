import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AdminForm } from "@/components/admin/AdminForm";
import { CheckField, SelectField, TextArea, TextField } from "@/components/admin/Fields";
import { OddsEditor } from "@/components/admin/OddsEditor";
import { buttonClasses } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { isoToParisLocal } from "@/lib/admin";
import { saveBooster } from "@/lib/actions/admin";
import { BOOSTER_KIND_LABELS } from "@/lib/boosters";
import { listAdminBoosters, requireAdmin } from "@/lib/data/admin";
import { formatCoins } from "@/lib/format";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Admin · Boosters" };

export default async function AdminBoostersPage({ searchParams }: PageProps<"/admin/boosters">) {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const { id } = await searchParams;
  const boosters = await listAdminBoosters();
  const editing = id === "nouveau" ? null : boosters.find((b) => String(b.id) === id) ?? null;
  const showForm = id === "nouveau" || editing;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_480px]">
      <Panel
        title={`Boosters (${boosters.length})`}
        action={
          <Link href="/admin/boosters?id=nouveau" className={buttonClasses("primary", "sm")}>
            Nouveau
          </Link>
        }
      >
        <ul className="divide-y divide-line">
          {boosters.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/boosters?id=${b.id}`}
                className={clsx("flex items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-night-800", editing?.id === b.id && "bg-night-700", !b.is_active && "opacity-50")}
              >
                <span>
                  <span className="font-semibold">{b.name}</span>
                  <span className="ml-2 text-xs text-chalk-faint">{BOOSTER_KIND_LABELS[b.kind]}</span>
                </span>
                <span className="text-xs text-chalk-muted">
                  {b.price ? `${formatCoins(b.price)} pièces` : "Gratuit"} · {b.cards_count} cartes
                  {b.kind === "limited" && ` · stock ${b.stock_remaining}/${b.stock_total}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {showForm && (
        <Panel title={editing ? `Modifier : ${editing.name}` : "Nouveau booster"}>
          <AdminForm key={editing?.id ?? "new"} action={saveBooster}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            {editing && <input type="hidden" name="kind" value={editing.kind} />}
            <TextField label="Nom" name="name" defaultValue={editing?.name} required maxLength={60} />
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Type" name="kind" defaultValue="standard" required options={Object.entries(BOOSTER_KIND_LABELS).map(([value, label]) => ({ value, label }))} />
                <TextField label="Slug" name="slug" hint="Vide : généré depuis le nom." maxLength={60} />
              </div>
            )}
            <TextArea label="Description" name="description" defaultValue={editing?.description ?? ""} maxLength={300} />
            <div className="grid grid-cols-3 gap-3">
              <TextField label="Prix" name="price" type="number" min={0} defaultValue={editing?.price ?? 200} hint="Ignoré pour un gratuit." />
              <TextField label="Cartes" name="cards_count" type="number" min={1} max={20} defaultValue={editing?.cards_count ?? 5} required />
              <TextField label="Ordre" name="sort_order" type="number" min={0} defaultValue={editing?.sort_order ?? 0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Garantie : rareté"
                name="guarantee_rarity"
                defaultValue={editing?.guarantee_rarity ?? ""}
                emptyLabel="Aucune"
                options={RARITIES.map((r) => ({ value: r, label: `${RARITY_LABELS[r]} ou mieux` }))}
              />
              <TextField label="Garantie : nombre" name="guarantee_count" type="number" min={0} max={20} defaultValue={editing?.guarantee_count ?? 0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Début (heure de Paris)" name="starts_at" type="datetime-local" defaultValue={isoToParisLocal(editing?.starts_at ?? null)} hint="Obligatoire pour un événement." />
              <TextField label="Fin (heure de Paris)" name="ends_at" type="datetime-local" defaultValue={isoToParisLocal(editing?.ends_at ?? null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Stock total" name="stock_total" type="number" min={1} defaultValue={editing?.stock_total ?? ""} hint="Édition limitée uniquement." />
              <TextField label="Stock restant" name="stock_remaining" type="number" min={0} defaultValue={editing?.stock_remaining ?? ""} />
            </div>
            <OddsEditor initial={Object.fromEntries((editing?.odds ?? []).map((o) => [o.rarity, o.probability]))} />
            <TextField label="Image (URL)" name="image_url" type="url" defaultValue={editing?.image_url ?? ""} hint="Vide = illustration générée." />
            <CheckField label="Actif (en vente)" name="is_active" defaultChecked={editing?.is_active ?? true} />
          </AdminForm>
        </Panel>
      )}
    </div>
  );
}
