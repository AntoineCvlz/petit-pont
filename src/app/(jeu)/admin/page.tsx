import type { Metadata } from "next";
import Link from "next/link";
import { PurgeDemoButton } from "@/components/admin/AdminButtons";
import { CoinAmount } from "@/components/ui/CoinAmount";
import { Panel } from "@/components/ui/Panel";
import { getEconomyStats, requireAdmin } from "@/lib/data/admin";
import { COIN_TX_LABELS, isCoinTxType } from "@/lib/economy";
import { formatCoins } from "@/lib/format";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";

export const metadata: Metadata = { title: "Administration" };

function Stat({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-night-850 p-3">
      <p className="text-xs text-chalk-muted">{label}</p>
      <p className={tone === "danger" ? "font-display text-2xl font-extrabold text-danger" : "font-display text-2xl font-extrabold tabular-nums"}>
        {children}
      </p>
    </div>
  );
}

export default async function AdminDashboard() {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const s = await getEconomyStats();
  const created = Object.entries(s.coins_by_type).filter(([, v]) => v > 0);
  const destroyed = Object.entries(s.coins_by_type).filter(([, v]) => v < 0);
  const label = (t: string) => (isCoinTxType(t) ? COIN_TX_LABELS[t] : t);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Joueurs (dont démo)">
          {s.players} <span className="text-sm text-chalk-faint">({s.demo_players})</span>
        </Stat>
        <Stat label="Actifs sur 7 jours">{s.active_7d}</Stat>
        <Stat label="Pièces en circulation">
          <CoinAmount amount={s.coins_in_circulation} className="font-display text-2xl" />
        </Stat>
        <Stat label="Soldes incohérents" tone={s.inconsistent_balances > 0 ? "danger" : undefined}>
          {s.inconsistent_balances}
        </Stat>
        <Stat label="Ventes au marché">{s.market_sales}</Stat>
        <Stat label="Volume du marché">{formatCoins(s.market_volume)}</Stat>
        <Stat label="Commissions détruites">{formatCoins(s.market_fees_burned)}</Stat>
        <Stat label="Annonces actives">{s.active_listings}</Stat>
        <Stat label="Exemplaires édités">{formatCoins(s.cards_minted)}</Stat>
        <Stat label="Échanges conclus">{s.trades_accepted}</Stat>
        <Stat label="Échanges en attente">{s.trades_pending}</Stat>
        <Stat label="Signalements ouverts" tone={s.open_reports > 0 ? "danger" : undefined}>
          <Link href="/admin/signalements" className="hover:underline">
            {s.open_reports}
          </Link>
        </Stat>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Pièces créées">
          <ul className="space-y-1 text-sm">
            {created.map(([t, v]) => (
              <li key={t} className="flex justify-between">
                <span>{label(t)}</span>
                <span className="text-success tabular-nums">+{formatCoins(v)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Pièces dépensées">
          <ul className="space-y-1 text-sm">
            {destroyed.map(([t, v]) => (
              <li key={t} className="flex justify-between">
                <span>{label(t)}</span>
                <span className="tabular-nums">−{formatCoins(-v)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-chalk-faint">Les échanges et ventes entre joueurs déplacent des pièces sans en créer ; seule la commission en détruit.</p>
        </Panel>
        <Panel title="Boosters ouverts et cartes éditées">
          <ul className="space-y-1 text-sm">
            {Object.entries(s.openings_by_booster).map(([name, n]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {RARITIES.map((r) => (
              <li key={r} className="flex justify-between">
                <span style={{ color: `var(--color-r-${r})` }}>{RARITY_LABELS[r]}</span>
                <span className="tabular-nums">{s.cards_by_rarity[r] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Comptes de démonstration">
        <p className="mb-3 text-sm text-chalk-muted">
          Les comptes fictifs du seed (marqués <code>is_demo</code>) animent le jeu en test. Supprime-les avant d&apos;ouvrir aux vrais joueurs.
        </p>
        <PurgeDemoButton count={s.demo_players} />
      </Panel>
    </div>
  );
}
