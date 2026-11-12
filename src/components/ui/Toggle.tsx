"use client";

import { clsx } from "clsx";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150",
        checked ? "border-turf bg-turf/80" : "border-line-strong bg-night-700",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-chalk shadow transition-transform duration-150",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
