export const METRICS = {
  progression: { label: "Progression", unit: "%", hint: "Part du catalogue possédée (cartes différentes)" },
  cards: { label: "Cartes", unit: "cartes", hint: "Nombre d'exemplaires possédés" },
  albums: { label: "Albums complétés", unit: "albums", hint: "Albums dont la récompense a été réclamée" },
  rarity_score: { label: "Score de rareté", unit: "pts", hint: "Commune 1 · Rare 3 · Épique 8 · Légendaire 20 · Iconique 50 · Spéciale 120" },
  boosters: { label: "Boosters ouverts", unit: "boosters", hint: "Nombre de boosters ouverts" },
} as const;
export type Metric = keyof typeof METRICS;

export const PERIODS = {
  week: "7 derniers jours",
  month: "30 derniers jours",
  all: "Depuis toujours",
} as const;
export type Period = keyof typeof PERIODS;

export function parseMetric(v: unknown): Metric {
  return typeof v === "string" && v in METRICS ? (v as Metric) : "progression";
}

export function parsePeriod(v: unknown): Period {
  return typeof v === "string" && v in PERIODS ? (v as Period) : "all";
}

export function formatMetric(metric: Metric, value: number): string {
  if (metric === "progression") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  return value.toLocaleString("fr-FR");
}

/** Texte du fil d'activité pour une entrée dans un top 10. */
export function top10Label(metric: unknown): string {
  return typeof metric === "string" && metric in METRICS ? METRICS[metric as Metric].label.toLowerCase() : "classement";
}
