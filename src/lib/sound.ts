"use client";

/**
 * Sons synthétisés (Web Audio) : aucun fichier audio, aucun élément copié.
 * Appelés uniquement si le joueur a laissé les sons activés.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

/** Déchirure du paquet : bruit filtré bref. */
export function playTear() {
  const ac = audio();
  if (!ac) return;
  const length = Math.floor(ac.sampleRate * 0.25);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.value = 0.18;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start();
}

/** Révélation : plus la carte est rare, plus l'arpège monte. */
export function playReveal(rarityRank: number) {
  const base = 440;
  const steps = [0, 4, 7, 12, 16, 19];
  for (let i = 0; i < Math.min(rarityRank, steps.length); i++) {
    tone(base * 2 ** (steps[i]! / 12), i * 0.07, 0.25, rarityRank >= 4 ? "triangle" : "sine", rarityRank >= 4 ? 0.1 : 0.06);
  }
}
