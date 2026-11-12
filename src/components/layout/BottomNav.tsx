"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NAV_ITEMS, isActivePath, splitMobileNav } from "@/lib/navigation";
import { NavIcon } from "./NavIcon";

/** Barre de navigation inférieure (mobile) : 5 entrées max, puis menu « Plus ». */
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { primary, more } = splitMobileNav(NAV_ITEMS);
  const moreActive = more.some((i) => isActivePath(pathname, i.href));

  const tabClass = (active: boolean) =>
    clsx(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium",
      active ? "text-turf" : "text-chalk-muted",
    );

  return (
    <>
      <AnimatePresence>
        {open && more.length > 0 && (
          <motion.div
            className="fixed inset-x-2 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 rounded-xl border border-line-strong bg-night-850 p-1.5 shadow-2xl md:hidden"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
          >
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-chalk hover:bg-night-700"
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-line bg-night-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {primary.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <NavIcon name={item.icon} />
              <span className="max-w-full truncate px-1">{item.label === "Wiki des joueurs" ? "Wiki" : item.label}</span>
            </Link>
          );
        })}
        {more.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={tabClass(moreActive || open)}>
            <NavIcon name="more" />
            Plus
          </button>
        )}
      </nav>
    </>
  );
}
