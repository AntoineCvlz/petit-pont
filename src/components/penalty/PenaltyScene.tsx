"use client";

import { clsx } from "clsx";
import { DIRECTION_LABELS, DIRECTIONS, kickPath, SCENE, type Direction, type Kick } from "@/lib/penalty";

/** Durées de la séquence (ms) ; ramenées à zéro si les animations sont réduites. */
export const KICK_TIMING = { runup: 380, flight: 480, rebound: 300, hold: 900 } as const;

export type ScenePhase = "idle" | "runup" | "flight" | "outcome" | "rest";
export type SceneKick = Pick<Kick, "side" | "direction" | "dive" | "result">;

const SHOOTER_START = { x: 39, y: 61 };
const SHOOTER_STRIKE = { x: 46, y: 57.5 };

/**
 * Tir au but vu de derrière le tireur : élan, frappe, vol du ballon, plongeon du gardien, puis filet qui tremble,
 * arrêt (ballon repoussé) ou tir à côté. Le résultat vient de la base ; la scène ne fait que le montrer.
 */
export function PenaltyScene({
  mode,
  kick,
  phase,
  disabled,
  onChoose,
  shooterColor,
  keeperColor,
  shooterName,
  keeperName,
}: {
  mode: "shoot" | "save";
  kick: SceneKick | null;
  phase: ScenePhase;
  disabled: boolean;
  onChoose: (d: Direction) => void;
  shooterColor: string;
  keeperColor: string;
  shooterName: string;
  keeperName: string;
}) {
  const path = kick ? kickPath(kick) : null;
  const moving = phase !== "idle";
  const flown = path && (phase === "flight" || phase === "outcome" || phase === "rest");
  const settled = phase === "outcome" || phase === "rest";

  // Ballon : point de penalty → cible → (rebond éventuel)
  const ball =
    flown && path
      ? settled && path.rebound
        ? { ...path.rebound, scale: 0.8 }
        : path.ball
      : { ...SCENE.spot, scale: 1 };
  const ballTransition =
    phase === "flight"
      ? `transform ${KICK_TIMING.flight}ms cubic-bezier(.15,.6,.35,1)`
      : phase === "outcome" && path?.rebound
        ? `transform ${KICK_TIMING.rebound}ms ease-out`
        : "none";

  const keeper = flown && path ? path.keeper : { ...SCENE.keeper, rotate: 0 };
  const shooter = moving ? SHOOTER_STRIKE : SHOOTER_START;
  const striking = flown;

  return (
    <div className="relative mx-auto aspect-[5/3] w-full max-w-[600px] overflow-hidden rounded-xl select-none">
      <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f1d16" />
            <stop offset="1" stopColor="#173a27" />
          </linearGradient>
          <radialGradient id="pp-ball" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c9d3cd" />
          </radialGradient>
        </defs>
        {/* Tribune, pelouse, surface */}
        <rect width="100" height="60" fill="url(#pp-sky)" />
        <g fill="rgba(255,255,255,0.05)">
          {Array.from({ length: 24 }, (_, i) => (
            <circle key={i} cx={2 + i * 4.2} cy={3 + (i % 3)} r="0.9" />
          ))}
        </g>
        <path d="M0 30h100v30H0z" fill="#1a5230" />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M0 ${30 + i * 6}h100v3H0z`} fill="#1d5a35" />
        ))}
        <path d="M4 34h92M22 34l-8 18h72l-8-18" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
        <ellipse cx={SCENE.spot.x} cy={SCENE.spot.y + 0.8} rx="1.3" ry="0.5" fill="rgba(255,255,255,0.7)" />

        {/* Filet */}
        <g
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.25"
          className={clsx(settled && path?.net && "pp-net-shake")}
          style={{ transformOrigin: "50px 20px" }}
        >
          <path d="M14 8 18 5h64l4 3M18 5v26M82 5v26" fill="none" />
          {Array.from({ length: 18 }, (_, i) => (
            <line key={`v${i}`} x1={14 + i * 4.2} y1="8" x2={14 + i * 4.2} y2="34" />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1="14" y1={8 + i * 3.8} x2="86" y2={8 + i * 3.8} />
          ))}
        </g>
        {/* Cadre */}
        <path d="M14 34V8h72v26" fill="none" stroke="#f4f7f5" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Gardien (pieds à l'origine ; plongeon = rotation autour des pieds) */}
        <g
          style={{
            transform: `translate(${keeper.x}px, ${keeper.y}px) rotate(${keeper.rotate}deg)`,
            transition: flown && phase === "flight" ? "transform 420ms 60ms cubic-bezier(.2,.8,.3,1)" : "none",
          }}
        >
          <path d="M-1.6 0v-5M1.6 0v-5" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="-3" y="-11.5" width="6" height="7" rx="1.6" fill={keeperColor} />
          <path
            d={flown ? "M-2.6-10.5-6-15.5M2.6-10.5 6-15.5" : "M-2.6-10-5.5-7.5M2.6-10 5.5-7.5"}
            stroke={keeperColor}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx={flown ? -6.2 : -5.8} cy={flown ? -16 : -7.2} r="1.15" fill="#f4f7f5" />
          <circle cx={flown ? 6.2 : 5.8} cy={flown ? -16 : -7.2} r="1.15" fill="#f4f7f5" />
          <circle cx="0" cy="-13.3" r="1.9" fill="#e9c9a6" />
        </g>

        {/* Tireur, vu de dos */}
        <g
          style={{
            transform: `translate(${shooter.x}px, ${shooter.y}px)`,
            transition: phase === "runup" ? `transform ${KICK_TIMING.runup}ms ease-in` : "none",
          }}
        >
          <path d="M-1.8 0v-6.5" stroke="#1f2937" strokeWidth="1.9" strokeLinecap="round" />
          <path
            d="M1.8 0v-6.5"
            stroke="#1f2937"
            strokeWidth="1.9"
            strokeLinecap="round"
            style={{
              transformOrigin: "1.8px -6.5px",
              transform: striking ? "rotate(-55deg)" : "rotate(0deg)",
              transition: phase === "flight" ? "transform 140ms ease-out" : "none",
            }}
          />
          <rect x="-3.6" y="-8.6" width="7.2" height="3" rx="0.8" fill="#f4f7f5" />
          <rect x="-4" y="-16.5" width="8" height="8.5" rx="2.2" fill={shooterColor} />
          <path d="M-4-15.5-6.5-10.5M4-15.5l2.5 5" stroke={shooterColor} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="0" cy="-18.6" r="2.3" fill="#3b2a20" />
        </g>

        {/* Ballon */}
        <g
          style={{
            transform: `translate(${ball.x}px, ${ball.y}px) scale(${ball.scale})`,
            transition: ballTransition,
          }}
        >
          <circle r="2.1" fill="url(#pp-ball)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.25" />
          <path d="M0-0.9.85-.25.5.75h-1l-.35-1z" fill="#1f2937" />
        </g>
        {settled && path?.net && (
          <circle
            cx={path.ball.x}
            cy={path.ball.y}
            r="2"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.4"
            className="pp-ripple"
          />
        )}
      </svg>

      {/* Qui tire, qui garde */}
      <p className="pointer-events-none absolute bottom-1.5 left-2 max-w-[45%] truncate rounded bg-night-950/70 px-1.5 py-0.5 text-[11px] font-semibold sm:text-xs">
        <span className="text-chalk-muted">Tireur </span>
        {shooterName}
      </p>
      <p className="pointer-events-none absolute top-1 left-1/2 max-w-[60%] -translate-x-1/2 truncate rounded bg-night-950/70 px-1.5 py-0.5 text-[11px] font-semibold sm:text-xs">
        <span className="text-chalk-muted">Gardien </span>
        {keeperName}
      </p>

      {/* Zones de tir / de plongeon */}
      <div className="absolute top-[13.3%] right-[14%] bottom-[43.3%] left-[14%] grid grid-cols-3">
        {DIRECTIONS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(d)}
            className="m-0.5 rounded-md border border-transparent text-sm font-semibold text-transparent transition-colors duration-150 enabled:hover:border-white/60 enabled:hover:bg-white/10 enabled:hover:text-white focus-visible:border-white focus-visible:text-white focus-visible:outline-none"
            aria-label={`${mode === "shoot" ? "Tirer" : "Plonger"} ${d === "centre" ? "au centre" : `à ${d}`}`}
          >
            {DIRECTION_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  );
}
