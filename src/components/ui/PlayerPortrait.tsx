import { clsx } from "clsx";
import { Silhouette } from "./Card";

/**
 * Portrait détouré du joueur sur fond de pelouse (wiki), silhouette sinon.
 * `round` : vignette ronde pour les listes.
 */
export function PlayerPortrait({
  imageUrl,
  name,
  round = false,
  className,
}: {
  imageUrl: string | null;
  name: string;
  round?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "pp-pitch relative shrink-0 overflow-hidden border border-line-strong bg-[radial-gradient(circle_at_50%_30%,#2c5a3c,#10201a_70%)]",
        round ? "rounded-full" : "rounded-xl",
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- image_url remplaçable (Wikimedia ou portrait hors Git)
        <img
          src={imageUrl}
          alt={round ? "" : `Portrait de ${name}`}
          loading="lazy"
          decoding="async"
          className={clsx(
            "absolute inset-x-0 bottom-0 mx-auto h-full w-full object-contain object-bottom drop-shadow-[0_6px_12px_rgba(0,0,0,0.55)]",
            round && "scale-125 object-top",
          )}
        />
      ) : (
        <div className="absolute inset-x-[8%] bottom-0 top-[12%] opacity-80">
          <Silhouette color="#2b3a33" />
        </div>
      )}
    </div>
  );
}
