import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { clsx } from "clsx";
import { buttonClasses } from "@/components/ui/Button";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { FilterBar, FilterBarSkeleton } from "@/components/ui/FilterBar";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Panel";
import { COIN_PAGE_SIZE, getCoinTotals, listCoinTransactions } from "@/lib/data/economy";
import { requireProfile } from "@/lib/data/profile";
import { COIN_TX_LABELS, COIN_TX_TYPES, isCoinTxType } from "@/lib/economy";
import { formatCoins } from "@/lib/format";

export const metadata: Metadata = { title: "Historique des pièces" };

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function CoinHistoryPage({ searchParams }: PageProps<"/profil/pieces">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const type = isCoinTxType(params.type) ? params.type : null;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(params.page ?? "1"), 10) || 1));

  const [{ rows, total }, totals] = await Promise.all([listCoinTransactions(profile.id, { page, type }), getCoinTotals()]);
  const pages = Math.max(1, Math.ceil(total / COIN_PAGE_SIZE));

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/profil/pieces?${s}` : "/profil/pieces";
  };

  return (
    <>
      <Link href="/profil" className="text-sm text-chalk-muted hover:text-chalk">
        ← Profil
      </Link>
      <PageHeader title="Historique des pièces" subtitle="Chaque mouvement est journalisé ; ton solde en est la somme exacte." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs text-chalk-muted">Solde actuel</p>
          <CoinAmount amount={profile.coins} className="font-display text-2xl" />
        </Panel>
        <Panel>
          <p className="text-xs text-chalk-muted">Total gagné</p>
          <p className="font-display text-2xl font-extrabold text-success tabular-nums">+{formatCoins(totals.earned)}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-chalk-muted">Total dépensé</p>
          <p className="font-display text-2xl font-extrabold text-chalk-muted tabular-nums">−{formatCoins(totals.spent)}</p>
        </Panel>
      </div>

      <div className="mb-3">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar
            searchName={null}
            selects={[
              {
                name: "type",
                label: "Type de mouvement",
                allLabel: "Tous les mouvements",
                options: COIN_TX_TYPES.map((t) => ({ value: t, label: COIN_TX_LABELS[t] })),
              },
            ]}
          />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun mouvement">Rien à afficher pour ce filtre.</EmptyState>
      ) : (
        <Panel>
          <table className="w-full text-sm">
            <caption className="sr-only">Mouvements de pièces, du plus récent au plus ancien</caption>
            <thead className="text-left text-xs text-chalk-faint">
              <tr>
                <th scope="col" className="pb-2 font-medium">Date</th>
                <th scope="col" className="pb-2 font-medium">Mouvement</th>
                <th scope="col" className="pb-2 text-right font-medium">Montant</th>
                <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3 whitespace-nowrap text-chalk-muted">{dateTime.format(new Date(r.createdAt))}</td>
                  <td className="py-2 pr-3">
                    <p>{COIN_TX_LABELS[r.type]}</p>
                    {r.description && r.description !== COIN_TX_LABELS[r.type] && (
                      <p className="text-xs text-chalk-faint">{r.description}</p>
                    )}
                  </td>
                  <td className={clsx("py-2 text-right font-semibold tabular-nums", r.amount > 0 ? "text-success" : "text-chalk")}>
                    {r.amount > 0 ? "+" : "−"}
                    {formatCoins(Math.abs(r.amount))}
                  </td>
                  <td className="hidden py-2 text-right text-chalk-muted tabular-nums sm:table-cell">{formatCoins(r.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className={buttonClasses("secondary", "sm")}>
                  ← Plus récents
                </Link>
              ) : (
                <span />
              )}
              <span className="text-chalk-muted tabular-nums">
                Page {page} / {pages}
              </span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} className={buttonClasses("secondary", "sm")}>
                  Plus anciens →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </Panel>
      )}
    </>
  );
}
