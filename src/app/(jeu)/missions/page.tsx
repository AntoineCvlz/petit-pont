import type { Metadata } from "next";
import { MissionsBoard, TokenShop } from "@/components/farm/MissionsBoard";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { getMissionsStatus } from "@/lib/data/farm";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Missions" };

export default async function MissionsPage() {
  const status = await getMissionsStatus();
  return (
    <>
      <PageHeader
        title="Missions"
        subtitle={`Accomplis des objectifs pour gagner des jetons, puis échange-les contre des packs. Nouvelles missions du jour le ${formatDate(status.dailyReset)}, de la semaine le ${formatDate(status.weeklyReset)}.`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Objectifs">
          <MissionsBoard missions={status.missions} />
        </Panel>
        <Panel title="Boutique à jetons">
          <TokenShop tokens={status.tokens} shop={status.shop} />
          <p className="mt-3 text-xs text-chalk-faint">Les packs achetés arrivent dans « Packs offerts » sur la page Boosters.</p>
        </Panel>
      </div>
    </>
  );
}
