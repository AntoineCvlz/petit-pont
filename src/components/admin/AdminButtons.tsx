"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { purgeDemoAccounts, resolveReport, type AdminResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

function Feedback({ result }: { result: AdminResult | null }) {
  if (!result?.message) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-success" : "text-sm text-danger"}>
      {result.message}
    </p>
  );
}

export function PurgeDemoButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  return (
    <div className="space-y-2">
      <Button variant="danger" onClick={() => setOpen(true)} disabled={count === 0}>
        Supprimer les {count} comptes de démo
      </Button>
      <Feedback result={result} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Supprimer les comptes de démo ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setResult(await purgeDemoAccounts());
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </>
        }
      >
        <p>
          Les {count} comptes de démo, leurs cartes, annonces, échanges, journaux de pièces et activités seront supprimés. Les cartes qu&apos;ils ont
          vendues ou échangées aux vrais joueurs restent chez ces derniers. Action irréversible.
        </p>
      </Modal>
    </div>
  );
}

export function ReportActions({ reportId }: { reportId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const run = (status: "resolved" | "dismissed") =>
    start(async () => {
      setResult(await resolveReport(reportId, status));
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => run("resolved")} disabled={pending}>
        Traité
      </Button>
      <Button size="sm" variant="ghost" onClick={() => run("dismissed")} disabled={pending}>
        Sans suite
      </Button>
      <Feedback result={result} />
    </div>
  );
}
