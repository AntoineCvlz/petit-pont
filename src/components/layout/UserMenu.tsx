"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/Avatar";

export function UserMenu({ username, isAdmin = false }: { username: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-night-800"
      >
        <Avatar name={username} />
        <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">{username}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1.5 w-48 animate-fade-in rounded-xl border border-line-strong bg-night-850 p-1.5 shadow-2xl">
          <p className="truncate px-3 pt-1 pb-2 text-xs text-chalk-faint">Connecté·e en tant que {username}</p>
          <Link role="menuitem" href="/profil" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-night-700">
            Mon profil
          </Link>
          <Link role="menuitem" href="/notifications" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-night-700">
            Notifications
          </Link>
          <Link role="menuitem" href="/joueurs" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-night-700">
            Rechercher un joueur
          </Link>
          {isAdmin && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-r-iconique hover:bg-night-700">
              Administration
            </Link>
          )}
          <form action={signOut}>
            <button role="menuitem" type="submit" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-night-700">
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
