"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockPlayer, reportPlayer, unblockPlayer, type ModerationResult } from "@/lib/actions/moderation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Signaler / bloquer un joueur depuis son profil public. */
export function ModerationButtons({ playerId, username, blocked }: { playerId: string; username: string; blocked: boolean }) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ModerationResult | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={() => { setResult(null); setReportOpen(true); }}>
        Signaler
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await (blocked ? unblockPlayer(playerId) : blockPlayer(playerId)));
            router.refresh();
          })
        }
      >
        {blocked ? "Débloquer" : "Bloquer"}
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-xs text-success" : "text-xs text-danger"}>
          {result.message}
        </p>
      )}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Signaler ${username}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const r = await reportPlayer(playerId, reason);
                  setResult(r);
                  if (r.ok) {
                    setReason("");
                    setReportOpen(false);
                  }
                })
              }
            >
              Envoyer le signalement
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide uppercase">Motif</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Pseudo insultant, comportement abusif dans les échanges…"
            className="w-full rounded-lg border border-line-strong bg-night-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-turf focus:outline-none"
          />
        </label>
        {result && !result.ok && (
          <p role="alert" className="mt-2 text-danger">
            {result.message}
          </p>
        )}
      </Modal>
    </div>
  );
}
