import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { ReportActions } from "@/components/admin/AdminButtons";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { listReports, requireAdmin } from "@/lib/data/admin";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Signalements" };

const STATUS = { open: "Ouvert", resolved: "Traité", dismissed: "Sans suite" } as const;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/signalements">) {
  // Chaque page vérifie elle-même le rôle : un layout n'est pas une frontière d'autorisation
  await requireAdmin();
  const { vue } = await searchParams;
  const tab = vue === "clos" ? "closed" : "open";
  const reports = await listReports(tab);

  return (
    <>
      <div className="mb-3 flex gap-1">
        {(
          [
            ["open", "/admin/signalements", "Ouverts"],
            ["closed", "/admin/signalements?vue=clos", "Clos"],
          ] as const
        ).map(([key, href, label]) => (
          <Link key={key} href={href} className={clsx("rounded-lg px-3 py-1 text-sm", tab === key ? "bg-night-600 font-semibold" : "text-chalk-muted hover:bg-night-800")}>
            {label}
          </Link>
        ))}
      </div>
      {reports.length === 0 ? (
        <EmptyState title={tab === "open" ? "Aucun signalement ouvert" : "Aucun signalement clos"} />
      ) : (
        <Panel>
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link href={`/joueurs/${encodeURIComponent(r.reporter)}`} className="font-semibold hover:underline">
                      {r.reporter}
                    </Link>{" "}
                    signale{" "}
                    <Link href={`/joueurs/${encodeURIComponent(r.reported)}`} className="font-semibold text-r-iconique hover:underline">
                      {r.reported}
                    </Link>
                    <span className="ml-2 text-xs text-chalk-faint">{formatRelative(r.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-sm text-chalk-muted">« {r.reason} »</p>
                </div>
                {r.status === "open" ? <ReportActions reportId={r.id} /> : <span className="text-xs text-chalk-muted">{STATUS[r.status]}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
