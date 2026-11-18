"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";

export type FilterSelect = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Libellé de l'option « toutes » ; absent = pas d'option vide (ex. tri). */
  allLabel?: string;
};

export type FilterToggle = { name: string; label: string };

const fieldClass =
  "h-9 rounded-lg border border-line-strong bg-night-900 px-2.5 text-sm text-chalk focus:border-turf focus:outline-none";

/**
 * Barre de filtres synchronisée avec l'URL (partageable, rendue côté serveur).
 * Recherche avec anti-rebond ; les listes et cases s'appliquent immédiatement.
 */
export function FilterBar({
  searchName = "q",
  searchPlaceholder = "Rechercher…",
  selects,
  toggles = [],
}: {
  /** null = pas de champ de recherche. */
  searchName?: string | null;
  searchPlaceholder?: string;
  selects: FilterSelect[];
  toggles?: FilterToggle[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchName ? (params.get(searchName) ?? "") : "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  function update(name: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    next.delete("page"); // tout changement de filtre revient à la première page
    if (value) next.set(name, value);
    else next.delete(name);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function onSearch(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (!searchName) return;
    debounce.current = setTimeout(() => update(searchName, value.trim() || null), 250);
  }

  const activeCount =
    selects.filter((s) => s.allLabel && params.get(s.name)).length + toggles.filter((t) => params.get(t.name)).length;
  const active = activeCount > 0 || Boolean(searchName && params.get(searchName));
  // Mobile : les listes sont repliées derrière un bouton (la recherche reste visible) ; toujours ouvertes dès sm
  const [open, setOpen] = useState(false);

  return (
    <div
      role="search"
      className={clsx("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-70")}
    >
      {searchName && (
        <>
          <label className="sr-only" htmlFor={`filter-${searchName}`}>
            {searchPlaceholder}
          </label>
          <input
            id={`filter-${searchName}`}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={clsx(fieldClass, "min-w-0 flex-1 placeholder:text-chalk-faint sm:w-56 sm:flex-none")}
          />
        </>
      )}
      {(selects.length > 0 || toggles.length > 0) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className={clsx(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold sm:hidden",
            open || activeCount > 0 ? "border-turf/60 text-turf" : "border-line-strong text-chalk-muted",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filtres
          {activeCount > 0 && (
            <span className="rounded-full bg-turf px-1.5 text-xs leading-5 text-night-950">{activeCount}</span>
          )}
        </button>
      )}
      <div id="filter-panel" className={clsx(open ? "flex" : "hidden", "w-full flex-wrap gap-2 sm:contents")}>
        {selects.map((s) => (
          <label key={s.name} className="min-w-0 basis-[calc(50%-0.25rem)] sm:basis-auto">
            <span className="sr-only">{s.label}</span>
            <select
              value={params.get(s.name) ?? (s.allLabel ? "" : s.options[0]?.value)}
              onChange={(e) => update(s.name, e.target.value || null)}
              className={clsx(fieldClass, "w-full sm:w-auto")}
              aria-label={s.label}
            >
              {s.allLabel && <option value="">{s.allLabel}</option>}
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {toggles.map((t) => (
          <label
            key={t.name}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-2.5 text-sm whitespace-nowrap"
          >
            <input
              type="checkbox"
              checked={params.get(t.name) === "1"}
              onChange={(e) => update(t.name, e.target.checked ? "1" : null)}
              className="accent-turf"
            />
            {t.label}
          </label>
        ))}
      </div>
      {active && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="h-9 px-2 text-sm text-chalk-muted hover:text-chalk"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

/** Version inerte affichée pendant le chargement des paramètres d'URL. */
export function FilterBarSkeleton() {
  return <div aria-hidden="true" className="h-9 w-full max-w-xl animate-pulse rounded-lg bg-night-700/70" />;
}
