import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AdminForm } from "@/components/admin/AdminForm";
import { CheckField, SelectField, TextArea, TextField } from "@/components/admin/Fields";
import { buttonClasses } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { savePlayer } from "@/lib/actions/admin";
import { getReferenceOptions, listAdminPlayers, requireAdmin } from "@/lib/data/admin";
import { POSITION_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Admin · Joueurs" };

export default async function AdminPlayersPage({ searchParams }: PageProps<"/admin/joueurs">) {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const { id, q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const [players, refs] = await Promise.all([listAdminPlayers(search), getReferenceOptions()]);
  const editing = id === "nouveau" ? null : players.find((p) => String(p.id) === id) ?? null;
  const showForm = id === "nouveau" || editing;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <Panel
        title={`Footballeurs (${players.length})`}
        action={
          <Link href="/admin/joueurs?id=nouveau" className={buttonClasses("primary", "sm")}>
            Nouveau
          </Link>
        }
      >
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={search} placeholder="Rechercher…" aria-label="Rechercher un footballeur" className="h-8 flex-1 rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm" />
          <button className={buttonClasses("secondary", "sm")}>Chercher</button>
        </form>
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {players.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/joueurs?id=${p.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className={clsx("flex items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-night-800", editing?.id === p.id && "bg-night-700")}
              >
                <span>
                  <span className="font-semibold">{p.display_name}</span>
                  <span className="ml-2 text-xs text-chalk-faint">
                    {p.nationName} · {POSITION_LABELS[p.position]}
                    {p.is_legend && " · Légende"}
                  </span>
                </span>
                <span className="text-xs text-chalk-muted">{p.versions} carte{p.versions > 1 ? "s" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {showForm && (
        <Panel title={editing ? `Modifier : ${editing.display_name}` : "Nouveau footballeur"}>
          <AdminForm key={editing?.id ?? "new"} action={savePlayer}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <TextField label="Nom affiché" name="display_name" defaultValue={editing?.display_name} required maxLength={60} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Prénom" name="first_name" defaultValue={editing?.first_name ?? ""} maxLength={60} />
              <TextField label="Nom" name="last_name" defaultValue={editing?.last_name} required maxLength={60} />
            </div>
            <TextField label="Slug" name="slug" defaultValue={editing?.slug} hint="Laisser vide : généré depuis le nom affiché." maxLength={60} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Nation" name="nation_id" defaultValue={editing?.nation_id} required options={refs.nations.map((n) => ({ value: n.id, label: n.name }))} />
              <SelectField label="Poste" name="position" defaultValue={editing?.position} required options={Object.entries(POSITION_LABELS).map(([value, label]) => ({ value, label }))} />
            </div>
            <TextField label="Année de naissance" name="birth_year" type="number" min={1900} max={2020} defaultValue={editing?.birth_year ?? ""} />
            <TextArea label="Biographie courte" name="bio" defaultValue={editing?.bio ?? ""} maxLength={600} />
            <TextField label="Image (URL)" name="image_url" type="url" defaultValue={editing?.image_url ?? ""} hint="Placeholder illustré par défaut ; pas de photo réelle." />
            <CheckField label="Légende" name="is_legend" defaultChecked={editing?.is_legend} />
          </AdminForm>
        </Panel>
      )}
    </div>
  );
}
