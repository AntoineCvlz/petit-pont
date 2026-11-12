"use client";

import { useRef, type HTMLAttributes, type PointerEvent } from "react";

/**
 * Effet holographique des cartes Spéciales : suit le pointeur (reflet + légère inclinaison).
 * Désactivé par CSS si l'utilisateur préfère les animations réduites.
 */
export function HoloTilt({ children, ...rest }: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--hx", `${x * 100}%`);
    el.style.setProperty("--hy", `${y * 100}%`);
    el.style.setProperty("--tilt-x", `${(0.5 - y) * 10}deg`);
    el.style.setProperty("--tilt-y", `${(x - 0.5) * 12}deg`);
    el.style.setProperty("--holo-angle", `${100 + x * 80}deg`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    for (const prop of ["--mx", "--my", "--hx", "--hy", "--tilt-x", "--tilt-y", "--holo-angle"]) {
      el.style.removeProperty(prop);
    }
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
    </div>
  );
}
