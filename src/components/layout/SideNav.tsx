"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { NavIcon } from "./NavIcon";

/** Navigation latérale compacte (écrans larges). */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 border-r border-line px-2 py-3 md:block">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                  active ? "bg-night-700 font-semibold text-chalk" : "text-chalk-muted hover:bg-night-800 hover:text-chalk",
                )}
              >
                <NavIcon name={item.icon} className={clsx("h-[18px] w-[18px]", active && "text-turf")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
