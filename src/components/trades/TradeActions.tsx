"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptTrade, cancelTrade, declineTrade, type TradeResult } from "@/lib/actions/trades";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function TradeActions({ tradeId, role, summary }: { tradeId: string; role: "recipient" | "proposer"; summary: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<TradeResult | null>(null);

  function run(action: (id: string) => Promise<TradeResult>) {
    start(async () => {
      const r = await action(tradeId);
      setResult(r);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (result?.ok) {
    return (
      <p role="status" className="text-sm font-semibold text-success">
        {result.message}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {role === "recipient" ? (
        <>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={pending}>
            Accepter
          </Button>
          <Link href={`/echanges/nouveau?contre=${tradeId}`} className={buttonClasses("secondary", "sm")}>
            Contre-proposer
          </Link>
          <Button size="sm" variant="ghost" onClick={() => run(declineTrade)} disabled={pending}>
            Refuser
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => run(cancelTrade)} disabled={pending}>
          {pending ? "Annulation…" : "Annuler la proposition"}
        </Button>
      )}
      {result && !result.ok && (
        <p role="alert" className="w-full text-sm text-danger">
          {result.message}
        </p>
      )}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Accepter l'échange ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => run(acceptTrade)} disabled={pending}>
              {pending ? "Échange…" : "Confirmer l'échange"}
            </Button>
          </>
        }
      >
        <p>{summary}</p>
        <p className="mt-2">Le serveur revérifie que chaque carte est toujours disponible avant d&apos;échanger.</p>
      </Modal>
    </div>
  );
}
