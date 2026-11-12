import { clsx } from "clsx";

export function albumPercent(owned: number, total: number): number {
  return total === 0 ? 0 : Math.floor((owned / total) * 100);
}

export function AlbumProgress({ owned, total, complete, className }: { owned: number; total: number; complete?: boolean; className?: string }) {
  const pct = albumPercent(owned, total);
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-xs text-chalk-muted">
        <span className="tabular-nums">
          {owned} / {total}
        </span>
        <span className="tabular-nums">{pct} %</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-night-700"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression de l'album"
      >
        <div className={clsx("h-full rounded-full", complete ? "bg-r-legendaire" : "bg-turf")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
