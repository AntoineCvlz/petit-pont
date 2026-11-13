import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { AccountDangerZone, CoinsForm, CopyManager, GiveBoostersForm, GiveCardsForm, type CopyRow } from "@/components/admin/AccountTools";
import { AdminOpeningList } from "@/components/admin/AdminOpeningList";
import { AdminTradeList } from "@/components/admin/AdminTradeList";
import { Avatar } from "@/components/ui/Avatar";
import { Panel } from "@/components/ui/Panel";
import { describeAdminAction } from "@/lib/admin";
import { requireAdmin } from "@/lib/data/admin";
import { getAccountDetail, getGiftOptions } from "@/lib/data/admin-accounts";
import { formatCoins, formatDate, formatRelative } from "@/lib/format";
import { RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Admin · Compte" };

export default async function AdminAccountPage({ params }: PageProps<"/admin/comptes/[id]">) {
  const me = await requireAdmin();
  const { id } = await params;
  const [detail, options] = await Promise.all([getAccountDetail(id), getGiftOptions()]);
  if (!detail) notFound();
  const { account: a } = detail;

  const copies: CopyRow[] = detail.copies.map((c) => ({
    id: c.id,
    serialNumber: c.serialNumber,
    obtainedVia: c.obtainedVia,
    obtainedAt: c.obtainedAt,
    isLocked: c.isLocked,
    collectionNumber: c.template.collectionNumber,
    playerName: c.template.playerName,
    edition: c.template.edition === "Base" ? c.template.season : c.template.edition,
    rarity: c.template.rarity,
    maxSupply: c.template.maxSupply,
  }));

  return (
    <>
      <Link href="/admin/comptes" className="text-sm text-chalk-muted hover:text-chalk">
        ← Comptes
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-center gap-3">
        <Avatar name={a.username} url={a.avatarUrl} size="lg" />
        <div>
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold tracking-wide uppercase italic">
            {a.username}
            {a.isAdmin && <span className="rounded bg-r-iconique/15 px-1.5 text-xs not-italic text-r-iconique">admin</span>}
            {a.isDemo && <span className="rounded bg-night-700 px-1.5 text-xs not-italic text-chalk-muted">démo</span>}
            {a.bannedAt && <span className="rounded bg-danger/15 px-1.5 text-xs not-italic text-danger">banni</span>}
          </h1>
          <p className="text-sm text-chalk-muted">
            {formatCoins(a.coins)} pièces · {a.cards} cartes · inscrit le {formatDate(a.createdAt)} ·{" "}
            <Link href={`/joueurs/${encodeURIComponent(a.username)}`} className="text-turf hover:underline">
              profil public
            </Link>
          </p>
          {a.bannedAt && (
            <p className="mt-1 text-sm text-danger">
              Banni le {formatDate(a.bannedAt)}
              {a.banReason ? ` · « ${a.banReason} »` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Offrir des packs">
          <GiveBoostersForm userId={a.id} boosters={options.boosters} />
          {detail.pendingGifts.length > 0 && (
            <p className="mt-3 text-xs text-chalk-muted">
              En attente d&apos;ouverture : {detail.pendingGifts.map((g) => `${g.boosterName} ×${g.count}`).join(", ")}
            </p>
          )}
        </Panel>
        <Panel title="Offrir des cartes">
          <GiveCardsForm userId={a.id} />
        </Panel>
        <Panel title="Pièces">
          <CoinsForm userId={a.id} />
        </Panel>
      </div>

      <Panel title="Sanctions" className="mt-5">
        <AccountDangerZone userId={a.id} username={a.username} banned={a.bannedAt !== null} protectedAccount={a.isAdmin || a.id === me.id} />
      </Panel>

      <Panel title={`Collection (${copies.length} exemplaires)`} className="mt-5">
        <CopyManager copies={copies} />
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Dernières ouvertures de boosters">
          <AdminOpeningList openings={detail.openings} showPlayer={false} />
        </Panel>
        <Panel title="Derniers échanges">
          <AdminTradeList trades={detail.trades} />
        </Panel>
        <Panel title="Journal des pièces">
          {detail.coins.length === 0 ? (
            <p className="text-sm text-chalk-muted">Aucun mouvement.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {detail.coins.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate">
                    {c.description ?? c.type}
                    <span className="ml-2 text-xs text-chalk-faint">{formatRelative(c.createdAt)}</span>
                  </span>
                  <span className={clsx("shrink-0 tabular-nums", c.amount >= 0 ? "text-success" : "text-danger")}>
                    {c.amount >= 0 ? "+" : ""}
                    {formatCoins(c.amount)}
                    <span className="ml-2 text-xs text-chalk-faint">= {formatCoins(c.balanceAfter)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Actions d'administration">
          {detail.actions.length === 0 ? (
            <p className="text-sm text-chalk-muted">Aucune action.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {detail.actions.map((x) => (
                <li key={x.id} className="py-1.5">
                  {describeAdminAction(x.action, x.details)}
                  <span className="ml-2 text-xs text-chalk-faint">
                    par {x.adminUsername ?? "?"} · {formatRelative(x.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
