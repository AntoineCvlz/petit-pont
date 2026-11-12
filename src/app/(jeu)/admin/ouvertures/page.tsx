import type { Metadata } from "next";
import { AdminOpeningList } from "@/components/admin/AdminOpeningList";
import { Panel } from "@/components/ui/Panel";
import { requireAdmin } from "@/lib/data/admin";
import { listOpenings } from "@/lib/data/admin-accounts";

export const metadata: Metadata = { title: "Admin · Ouvertures" };

export default async function AdminOpeningsPage() {
  await requireAdmin();
  const openings = await listOpenings(80);
  return (
    <Panel title="Dernières ouvertures de boosters (tous joueurs)">
      <AdminOpeningList openings={openings} />
    </Panel>
  );
}
