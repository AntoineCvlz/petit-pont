import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AdminTradeList } from "@/components/admin/AdminTradeList";
import { Panel } from "@/components/ui/Panel";
import { requireAdmin } from "@/lib/data/admin";
import { listAllTrades } from "@/lib/data/admin-accounts";
import { TRADE_STATUS_LABELS, type TradeStatus } from "@/lib/trades";

export const metadata: Metadata = { title: "Admin · Échanges" };

const STATUSES = ["tous", ...(Object.keys(TRADE_STATUS_LABELS) as TradeStatus[])] as const;

export default async function AdminTradesPage({ searchParams }: PageProps<"/admin/echanges">) {
  await requireAdmin();
  const { statut } = await searchParams;
  const status = STATUSES.find((s) => s === statut) ?? "tous";
  const trades = await listAllTrades(status, 80);
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "tous" ? "/admin/echanges" : `/admin/echanges?statut=${s}`}
            className={clsx("rounded-lg px-3 py-1 text-sm", status === s ? "bg-night-600 font-semibold" : "text-chalk-muted hover:bg-night-800")}
          >
            {s === "tous" ? "Tous" : TRADE_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>
      <Panel>
        <AdminTradeList trades={trades} />
      </Panel>
    </>
  );
}
