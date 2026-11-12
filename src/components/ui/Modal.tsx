"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fenêtre modale accessible basée sur <dialog> (focus piégé, Échap, fond inerte).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clic sur le fond
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-night-850 p-0 text-chalk shadow-2xl backdrop:bg-night-950/75 backdrop:backdrop-blur-sm open:animate-fade-in"
    >
      <div className="p-5">
        <h2 id="modal-title" className="font-display text-xl font-extrabold tracking-wide uppercase italic">
          {title}
        </h2>
        <div className="mt-3 text-sm text-chalk-muted">{children}</div>
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}
