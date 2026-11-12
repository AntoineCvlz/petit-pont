import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { describeAdminAction } from "@/lib/admin";
import { requireAdmin } from "@/lib/data/admin";
import { listAdminActions } from "@/lib/data/admin-accounts";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Journal" };

export default async function AdminLogPage() {
  await requireAdmin();
  const actions = await listAdminActions(150);
  if (actions.length === 0) return <EmptyState title="Journal vide">Aucune action d&apos;administration pour le moment.</EmptyState>;
  return (
    <Panel title="Journal des actions d'administration">
      <ul className="divide-y divide-line text-sm">
        {actions.map((x) => (
          <li key={x.id} className="py-2">
            {x.targetId ? (
              <Link href={`/admin/comptes/${x.targetId}`} className="font-semibold hover:underline">
                {x.targetUsername}
              </Link>
            ) : (
              <span className="font-semibold">{x.targetUsername ?? "Compte supprimé"}</span>
            )}{" "}
            · {describeAdminAction(x.action, x.details)}
            <span className="ml-2 text-xs text-chalk-faint">
              par {x.adminUsername ?? "?"} · {formatRelative(x.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
