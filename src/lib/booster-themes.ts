/**
 * Habillage des boosters à thème (repéré par le slug) : couleurs du paquet et emblème.
 * - championnat : silhouette du logo (public/media/leagues/<code>.png), teintée à la couleur du paquet ;
 * - nation : drapeau (public/media/flags/<code>.svg) ;
 * - style : pictogramme dessiné (components/boosters/StyleIcon).
 */
export type StyleIconName = "dribble" | "feet" | "speed" | "target" | "wall" | "glove" | "star";

export type BoosterTheme = {
  foil: string;
  ink: string;
  label: string;
  emblem: { type: "league"; src: string } | { type: "flag"; code: string } | { type: "icon"; icon: StyleIconName };
};

const league = (code: string, foil: string, ink: string): BoosterTheme => ({
  foil,
  ink,
  label: "Championnat",
  emblem: { type: "league", src: `/media/leagues/${code}.png` },
});
const nation = (code: string, foil: string, ink: string): BoosterTheme => ({
  foil,
  ink,
  label: "Nation",
  emblem: { type: "flag", code },
});
const style = (icon: StyleIconName, foil: string, ink: string): BoosterTheme => ({
  foil,
  ink,
  label: "Style de jeu",
  emblem: { type: "icon", icon },
});

const cup = (code: string, foil: string, ink: string): BoosterTheme => ({
  ...league(code, foil, ink),
  label: "Coupe d'Europe",
});

const THEMES: Record<string, BoosterTheme> = {
  "ligue-des-champions": cup("UCL", "linear-gradient(160deg,#16206b,#05082a 50%,#2a3a9e 80%,#0b1250)", "#e8ecff"),
  "ligue-europa": cup("UEL", "linear-gradient(160deg,#7a3a0a,#241003 55%,#c25f12)", "#ffb066"),
  "ligue-conference": cup("UECL", "linear-gradient(160deg,#0f6b2a,#03210c 55%,#18a03f)", "#8dff9f"),

  "ligue-1": league("L1", "linear-gradient(160deg,#1c2f5c,#0a1430 55%,#2d4580)", "#e2f05a"),
  "premier-league": league("PL", "linear-gradient(160deg,#4d0b5a,#1d0322 55%,#6e1a7d)", "#5cf5a8"),
  laliga: league("LL", "linear-gradient(160deg,#5c1a1f,#22080b 55%,#8a2a2c)", "#ff7a6e"),
  "serie-a": league("SA", "linear-gradient(160deg,#173a8a,#08143a 55%,#2457b8)", "#7fd8ff"),
  bundesliga: league("BL", "linear-gradient(160deg,#6b1016,#250407 55%,#a01a22)", "#ffd9d6"),
  "saudi-pro-league": league("SPL", "linear-gradient(160deg,#145240,#061f18 55%,#1f7559)", "#b5f5d2"),

  "nation-france": nation("FRA", "linear-gradient(160deg,#1d3a8a,#0a1433 50%,#8a1d2a 85%,#3a0a12)", "#dfe8ff"),
  "nation-bresil": nation("BRA", "linear-gradient(160deg,#1a6b3a,#082614 50%,#a68a12 85%,#3d3205)", "#ffe36b"),
  "nation-argentine": nation("ARG", "linear-gradient(160deg,#3f7fb3,#10243a 55%,#5c9bd0)", "#e6f3ff"),
  "nation-espagne": nation("ESP", "linear-gradient(160deg,#8a1a1a,#2e0707 50%,#a6830f 85%,#3d2f05)", "#ffd36b"),
  "nation-angleterre": nation("ENG", "linear-gradient(160deg,#5a5f6b,#1a1c22 55%,#8a1d2a)", "#f2f4f8"),
  "nation-portugal": nation("POR", "linear-gradient(160deg,#145c2e,#071f10 50%,#8a1a1a 85%,#2e0707)", "#ffcf5c"),
  "nation-allemagne": nation("GER", "linear-gradient(160deg,#2a2a2a,#0d0d0d 50%,#8a1a1a 80%,#a6830f)", "#ffd36b"),

  "style-dribbleurs": style("dribble", "linear-gradient(160deg,#0f5e5c,#04211f 55%,#178a85)", "#7ff5e6"),
  "style-ambidextres": style("feet", "linear-gradient(160deg,#4a3b8a,#140f2e 55%,#6b58b8)", "#cfc2ff"),
  "style-fusees": style("speed", "linear-gradient(160deg,#8a5a0f,#2e1c04 55%,#c98a1a)", "#ffe08a"),
  "style-buteurs": style("target", "linear-gradient(160deg,#8a2a14,#2e0b04 55%,#c2451f)", "#ffb999"),
  "style-murailles": style("wall", "linear-gradient(160deg,#3f4a57,#12161b 55%,#5e6d7e)", "#d4dee8"),
  "style-gardiens": style("glove", "linear-gradient(160deg,#2c5a3c,#0c1f13 55%,#3f7a52)", "#c2f5a0"),
  "style-pepites": style("star", "linear-gradient(160deg,#6b2a5c,#24081f 55%,#a0408a)", "#ffc2ec"),
};

export function boosterTheme(slug: string | undefined | null): BoosterTheme | null {
  return (slug && THEMES[slug]) || null;
}
