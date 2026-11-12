import Link from "next/link";
import type { SaleView } from "@/lib/data/market";
import { formatCoins, formatRelative } from "@/lib/format";
import { RarityBadge } from "@/components/ui/RarityBadge";

export function SalesTable({ sales, showCard = true, compact = false }: { sales: SaleView[]; showCard?: boolean; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Ventes du marché, de la plus récente à la plus ancienne</caption>
      <thead className="text-left text-xs text-chalk-faint">
        <tr>
          {showCard && <th scope="col" className="pb-2 font-medium">Carte</th>}
          <th scope="col" className="pb-2 text-right font-medium">Prix</th>
          {!compact && <th scope="col" className="hidden pb-2 pl-4 font-medium sm:table-cell">Vendeur → acheteur</th>}
          <th scope="col" className="pb-2 text-right font-medium">Quand</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {sales.map((s) => (
          <tr key={s.id}>
            {showCard && (
              <td className="py-2 pr-3">
                <Link href={`/marche/carte/${s.template.id}`} className="font-semibold hover:text-turf hover:underline">
                  {s.template.playerName}
                </Link>{" "}
                <RarityBadge rarity={s.template.rarity} className="ml-1 align-middle" />
                {!compact && (
                  <span className="ml-1 text-xs text-chalk-faint">{s.template.edition === "Base" ? s.template.season : s.template.edition}</span>
                )}
              </td>
            )}
            <td className="py-2 text-right font-semibold text-coin tabular-nums">{formatCoins(s.price)}</td>
            {!compact && (
              <td className="hidden py-2 pl-4 text-chalk-muted sm:table-cell">
                {s.sellerUsername ?? "—"} → {s.buyerUsername ?? "—"}
              </td>
            )}
            <td className="py-2 pl-3 text-right whitespace-nowrap text-chalk-faint">{formatRelative(s.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
