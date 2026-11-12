import { clsx } from "clsx";
import { formatCoins } from "@/lib/format";

export function CoinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#f0c24b" />
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="#9a6f12" strokeWidth="1" />
      <path d="M8 4.6l1 2.1 2.3.3-1.7 1.6.4 2.3L8 9.8l-2 1.1.4-2.3L4.7 7l2.3-.3z" fill="#9a6f12" />
    </svg>
  );
}

export function CoinAmount({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-semibold tabular-nums text-coin", className)}>
      <CoinIcon />
      {formatCoins(amount)}
      <span className="sr-only">pièces</span>
    </span>
  );
}
