import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AdminForm } from "@/components/admin/AdminForm";
import { CheckField, SelectField, TextArea, TextField } from "@/components/admin/Fields";
import { buttonClasses } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { saveAlbum } from "@/lib/actions/admin";
import { listAdminAlbums, requireAdmin } from "@/lib/data/admin";
import { ALBUM_KIND_LABELS } from "@/lib/data/albums";

export const metadata: Metadata = { title: "Admin · Albums" };

export default async function AdminAlbumsPage({ searchParams }: PageProps<"/admin/albums">) {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const { id } = await searchParams;
  const albums = await listAdminAlbums();
  const editing = id === "nouveau" ? null : albums.find((a) => String(a.id) === id) ?? null;
  const showForm = id === "nouveau" || editing;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_460px]">
      <Panel
        title={`Albums (${albums.length})`}
        action={
          <Link href="/admin/albums?id=nouveau" className={buttonClasses("primary", "sm")}>
            Nouveau
          </Link>
        }
      >
        <ul className="divide-y divide-line">
          {albums.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/albums?id=${a.id}`}
                className={clsx("flex items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-night-800", editing?.id === a.id && "bg-night-700", !a.is_active && "opacity-50")}
              >
                <span>
                  <span className="font-semibold">{a.name}</span>
                  <span className="ml-2 text-xs text-chalk-faint">{ALBUM_KIND_LABELS[a.kind]}</span>
                </span>
                <span className="text-xs text-chalk-muted">
                  {a.collectionNumbers.length} emplacements · {a.reward_coins} pièces
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {showForm && (
        <Panel title={editing ? `Modifier : ${editing.name}` : "Nouvel album"}>
          <AdminForm key={editing?.id ?? "new"} action={saveAlbum}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <TextField label="Nom" name="name" defaultValue={editing?.name} required maxLength={60} />
            <TextField label="Slug" name="slug" defaultValue={editing?.slug} hint="Laisser vide : généré depuis le nom." maxLength={60} />
            <TextArea label="Description" name="description" defaultValue={editing?.description ?? ""} maxLength={300} />
            <div className="grid grid-cols-3 gap-3">
              <SelectField label="Type" name="kind" defaultValue={editing?.kind ?? "club"} required options={Object.entries(ALBUM_KIND_LABELS).map(([value, label]) => ({ value, label }))} />
              <TextField label="Récompense" name="reward_coins" type="number" min={0} defaultValue={editing?.reward_coins ?? 500} required />
              <TextField label="Ordre" name="sort_order" type="number" min={0} defaultValue={editing?.sort_order ?? 0} />
            </div>
            <TextArea
              label="Emplacements (numéros de collection, dans l'ordre)"
              name="slots"
              rows={5}
              defaultValue={editing?.collectionNumbers.join(", ") ?? ""}
              hint="Séparés par des virgules ou des espaces. Les numéros figurent dans Admin → Cartes."
            />
            <CheckField label="Actif" name="is_active" defaultChecked={editing?.is_active ?? true} />
          </AdminForm>
        </Panel>
      )}
    </div>
  );
}
