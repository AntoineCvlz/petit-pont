import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx("animate-pulse rounded-lg bg-night-700/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="space-y-5">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[5/7.4] w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
