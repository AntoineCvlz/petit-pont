"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clsx } from "clsx";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/community";
import type { NotificationView } from "@/lib/data/notifications";
import { formatRelative } from "@/lib/format";
import { safeRedirectPath } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

export function NotificationList({ rows }: { rows: NotificationView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const anyUnread = rows.some((r) => !r.isRead);

  function open(n: NotificationView) {
    start(async () => {
      if (!n.isRead) await markNotificationRead(n.id);
      router.push(safeRedirectPath(n.link ?? "/notifications"));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          disabled={!anyUnread || pending}
          onClick={() =>
            start(async () => {
              await markAllNotificationsRead();
              router.refresh();
            })
          }
        >
          Tout marquer comme lu
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-night-850">
        {rows.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={clsx("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-night-800", !n.isRead && "bg-turf/5")}
            >
              <span
                className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-turf")}
                aria-label={n.isRead ? undefined : "Non lue"}
              />
              <span className="min-w-0 flex-1">
                <span className={clsx("block text-sm", !n.isRead && "font-semibold")}>{n.title}</span>
                {n.body && <span className="block text-sm text-chalk-muted">{n.body}</span>}
              </span>
              <span className="shrink-0 text-xs text-chalk-faint">{formatRelative(n.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
