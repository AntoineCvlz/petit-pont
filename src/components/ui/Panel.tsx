import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-xl border border-line bg-night-850/90", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          {title && (
            <h2 className="font-display text-sm font-bold tracking-wider text-chalk-muted uppercase">{title}</h2>
          )}
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase italic">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-chalk-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pp-net rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-display text-lg font-bold tracking-wide uppercase">{title}</p>
      {children && <div className="mt-1.5 text-sm text-chalk-muted">{children}</div>}
    </div>
  );
}
