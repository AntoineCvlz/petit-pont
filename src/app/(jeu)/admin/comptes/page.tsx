import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { requireAdmin } from "@/lib/data/admin";
import { listAccounts, type AccountFilter } from "@/lib/data/admin-accounts";
import { formatCoins, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Comptes" };

const FILTERS: [AccountFilter, string][] = [
  ["tous", "Tous"],
  ["bannis", "Bannis"],
  ["demo", "Démo"],
];

export default async function AdminAccountsPage({ searchParams }: PageProps<"/admin/comptes">) {
  await requireAdmin();
  const { q, filtre } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const filter = FILTERS.find(([k]) => k === filtre)?.[0] ?? "tous";
  const accounts = await listAccounts(search, filter);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {FILTERS.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/comptes?filtre=${key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={clsx("rounded-lg px-3 py-1 text-sm", filter === key ? "bg-night-600 font-semibold" : "text-chalk-muted hover:bg-night-800")}
            >
              {label}
            </Link>
          ))}
        </div>
        <form role="search" className="flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="filtre" value={filter} />
          <label htmlFor="q" className="sr-only">
            Rechercher un compte
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Pseudo…"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-night-900 px-3 text-sm placeholder:text-chalk-faint focus:border-turf focus:outline-none sm:w-56"
          />
          <button type="submit" className={buttonClasses("secondary", "sm", "h-9")}>
            Chercher
          </button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="Aucun compte">Aucun compte ne correspond.</EmptyState>
      ) : (
        <Panel>
          <ul className="divide-y divide-line">
            {accounts.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/comptes/${a.id}`} className="flex items-center gap-3 py-2.5 hover:bg-night-800/60">
                  <Avatar name={a.username} url={a.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {a.username}
                      {a.isAdmin && <span className="rounded bg-r-iconique/15 px-1.5 text-xs text-r-iconique">admin</span>}
                      {a.isDemo && <span className="rounded bg-night-700 px-1.5 text-xs text-chalk-muted">démo</span>}
                      {a.bannedAt && <span className="rounded bg-danger/15 px-1.5 text-xs text-danger">banni</span>}
                    </p>
                    <p className="text-xs text-chalk-muted">
                      {formatCoins(a.coins)} pièces · {a.cards} cartes · inscrit le {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-chalk-faint">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
