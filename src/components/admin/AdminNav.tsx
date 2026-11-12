"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/comptes", label: "Comptes" },
  { href: "/admin/ouvertures", label: "Ouvertures" },
  { href: "/admin/echanges", label: "Échanges" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/joueurs", label: "Footballeurs" },
  { href: "/admin/cartes", label: "Cartes" },
  { href: "/admin/albums", label: "Albums" },
  { href: "/admin/boosters", label: "Boosters" },
  { href: "/admin/signalements", label: "Signalements" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="mt-1 flex gap-1 overflow-x-auto border-b border-line">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              active ? "border-r-iconique font-semibold text-chalk" : "border-transparent text-chalk-muted hover:text-chalk",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
