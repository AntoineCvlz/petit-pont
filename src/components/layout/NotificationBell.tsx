"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { subscribeToChanges } from "@/lib/realtime";
import { safeRedirectPath } from "@/lib/validation";

type Toast = { id: number; title: string; body: string | null; link: string | null };

/**
 * Cloche de notifications : compteur de non-lues mis à jour en direct (Realtime,
 * filtré sur le joueur et protégé par la RLS) et toast à chaque nouvelle notification.
 */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const reduce = useReducedMotion();
  // Le compteur serveur fait foi ; on y ajoute ce qui est arrivé en direct depuis
  const [base, setBase] = useState(initialUnread);
  const [live, setLive] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  if (base !== initialUnread) {
    setBase(initialUnread);
    setLive(0);
  }
  const unread = base + live;

  useEffect(
    () =>
      subscribeToChanges({ table: "notifications", event: "INSERT", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as Toast & { is_read: boolean };
        if (n.is_read) return;
        setLive((c) => c + 1);
        setToasts((t) => [...t.slice(-2), { id: n.id, title: n.title, body: n.body, link: n.link }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 6000);
      }),
    [userId],
  );

  return (
    <>
      <Link
        href="/notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-chalk-muted hover:bg-night-800 hover:text-chalk"
      >
        <span className="sr-only">Notifications</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-r-iconique px-1 text-center text-[10px] leading-4 font-bold text-night-950 tabular-nums">
            {unread > 99 ? "99+" : unread}
            <span className="sr-only"> non lue{unread > 1 ? "s" : ""}</span>
          </span>
        )}
      </Link>

      <div className="pointer-events-none fixed inset-x-2 top-16 z-50 flex flex-col items-end gap-2 sm:right-4 sm:left-auto" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto w-full max-w-sm"
            >
              <Link
                href={safeRedirectPath(t.link ?? "/notifications")}
                onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                className="block rounded-xl border border-line-strong bg-night-850 px-4 py-3 shadow-2xl hover:border-turf/50"
              >
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-chalk-muted">{t.body}</p>}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
