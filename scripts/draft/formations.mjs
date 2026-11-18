// Génère la migration des compositions de draft : postes (clé, libellé, ligne), coordonnées et liens entre voisins.
//   node scripts/draft/formations.mjs > supabase/migrations/<horodatage>_draft_formations.sql
// Chaque composition = lignes de l'arrière vers l'avant (gardien implicite), libellés de gauche à droite.

const FORMATIONS = [
  // [code, nom, lignes]
  ["3142", "3-1-4-2", [["DC", "DC", "DC"], ["MDC"], ["MG", "MC", "MC", "MD"], ["BU", "BU"]]],
  ["3412", "3-4-1-2", [["DC", "DC", "DC"], ["MG", "MC", "MC", "MD"], ["MOC"], ["BU", "BU"]]],
  ["3421", "3-4-2-1", [["DC", "DC", "DC"], ["MG", "MC", "MC", "MD"], ["AT", "AT"], ["BU"]]],
  ["343", "3-4-3", [["DC", "DC", "DC"], ["MG", "MC", "MC", "MD"], ["AG", "BU", "AD"]]],
  ["352", "3-5-2", [["DC", "DC", "DC"], ["MG", "MC", "MOC", "MC", "MD"], ["BU", "BU"]]],
  ["41212", "4-1-2-1-2", [["DG", "DC", "DC", "DD"], ["MDC"], ["MC", "MC"], ["MOC"], ["BU", "BU"]]],
  ["41212b", "4-1-2-1-2 (2)", [["DG", "DC", "DC", "DD"], ["MDC"], ["MG", "MD"], ["MOC"], ["BU", "BU"]]],
  ["4132", "4-1-3-2", [["DG", "DC", "DC", "DD"], ["MDC"], ["MG", "MC", "MD"], ["BU", "BU"]]],
  ["4141", "4-1-4-1", [["DG", "DC", "DC", "DD"], ["MDC"], ["MG", "MC", "MC", "MD"], ["BU"]]],
  ["4213", "4-2-1-3", [["DG", "DC", "DC", "DD"], ["MDC", "MDC"], ["MOC"], ["AG", "BU", "AD"]]],
  ["4222", "4-2-2-2", [["DG", "DC", "DC", "DD"], ["MDC", "MDC"], ["MOC", "MOC"], ["BU", "BU"]]],
  ["4231", "4-2-3-1", [["DG", "DC", "DC", "DD"], ["MDC", "MDC"], ["MG", "MOC", "MD"], ["BU"]]],
  ["4231b", "4-2-3-1 (2)", [["DG", "DC", "DC", "DD"], ["MDC", "MDC"], ["MOC", "MOC", "MOC"], ["BU"]]],
  ["424", "4-2-4", [["DG", "DC", "DC", "DD"], ["MC", "MC"], ["AG", "BU", "BU", "AD"]]],
  ["4312", "4-3-1-2", [["DG", "DC", "DC", "DD"], ["MC", "MC", "MC"], ["MOC"], ["BU", "BU"]]],
  ["4321", "4-3-2-1", [["DG", "DC", "DC", "DD"], ["MC", "MC", "MC"], ["AT", "AT"], ["BU"]]],
  ["433", "4-3-3", [["DG", "DC", "DC", "DD"], ["MC", "MC", "MC"], ["AG", "BU", "AD"]]],
  ["433b", "4-3-3 (2)", [["DG", "DC", "DC", "DD"], ["MDC"], ["MC", "MC"], ["AG", "BU", "AD"]]],
  ["433c", "4-3-3 (3)", [["DG", "DC", "DC", "DD"], ["MDC", "MDC"], ["MC"], ["AG", "BU", "AD"]]],
  ["433d", "4-3-3 (4)", [["DG", "DC", "DC", "DD"], ["MC", "MC"], ["MOC"], ["AG", "BU", "AD"]]],
  ["433e", "4-3-3 (5)", [["DG", "DC", "DC", "DD"], ["MC", "MDC", "MC"], ["AG", "AT", "AD"]]],
  ["4411", "4-4-1-1", [["DG", "DC", "DC", "DD"], ["MG", "MC", "MC", "MD"], ["AT"], ["BU"]]],
  ["442", "4-4-2", [["DG", "DC", "DC", "DD"], ["MG", "MC", "MC", "MD"], ["BU", "BU"]]],
  ["442b", "4-4-2 (2)", [["DG", "DC", "DC", "DD"], ["MG", "MDC", "MDC", "MD"], ["BU", "BU"]]],
  ["451", "4-5-1", [["DG", "DC", "DC", "DD"], ["MC"], ["MG", "MOC", "MOC", "MD"], ["BU"]]],
  ["451b", "4-5-1 (2)", [["DG", "DC", "DC", "DD"], ["MG", "MC", "MC", "MC", "MD"], ["BU"]]],
  ["5212", "5-2-1-2", [["DLG", "DC", "DC", "DC", "DLD"], ["MC", "MC"], ["MOC"], ["BU", "BU"]]],
  ["523", "5-2-3", [["DLG", "DC", "DC", "DC", "DLD"], ["MC", "MC"], ["AG", "BU", "AD"]]],
  ["532", "5-3-2", [["DLG", "DC", "DC", "DC", "DLD"], ["MC", "MC", "MC"], ["BU", "BU"]]],
  ["541", "5-4-1", [["DLG", "DC", "DC", "DC", "DLD"], ["MG", "MC", "MC", "MD"], ["BU"]]],
];

const POS = {
  DG: "DEF", DC: "DEF", DD: "DEF", DLG: "DEF", DLD: "DEF",
  MDC: "MIL", MC: "MIL", MG: "MIL", MD: "MIL", MOC: "MIL",
  AG: "ATT", AD: "ATT", AT: "ATT", BU: "ATT",
};
// Décalage vertical par libellé (latéraux et ailiers plus hauts, sentinelles plus basses…)
const DY = { DG: -4, DD: -4, DLG: -9, DLD: -9, MDC: 4, MOC: -3, MG: -3, MD: -3, AG: 4, AD: 4, AT: 3 };
const XS = { 1: [50], 2: [35, 65], 3: [26, 50, 74], 4: [13, 37, 63, 87], 5: [10, 30, 50, 70, 90] };
const LINE_X = { 2: { MG: [16, 84], MD: [16, 84] } }; // 4-1-2-1-2 (2) : milieux excentrés

function build([code, name, lines], sortOrder) {
  if (lines.flat().length !== 10) throw new Error(`${name} : ${lines.flat().length} joueurs de champ`);
  const slots = [{ key: "GB", label: "GB", pos: "GB", x: 50, y: 90 }];
  const rows = [];
  const yTop = 12;
  const yBottom = 72;
  lines.forEach((labels, li) => {
    const y = lines.length === 1 ? yBottom : yBottom - ((yBottom - yTop) * li) / (lines.length - 1);
    let xs = XS[labels.length];
    if (labels.length === 2 && labels[0] === "MG") xs = LINE_X[2].MG;
    rows.push(labels.map((label, i) => ({ label, pos: POS[label], x: xs[i], y: Math.round(y + (DY[label] ?? 0)) })));
  });
  // Clés uniques : suffixe G / D (et rien au milieu) pour les libellés répétés
  const all = rows.flat();
  for (const s of all) {
    const same = all.filter((o) => o.label === s.label).sort((a, b) => a.x - b.x);
    if (same.length === 1) s.key = s.label;
    else {
      const i = same.indexOf(s);
      s.key = i === 0 ? `${s.label}G` : i === same.length - 1 ? `${s.label}D` : s.label;
    }
  }
  slots.push(...all.map(({ key, label, pos, x, y }) => ({ key, label, pos, x, y })));
  const keys = slots.map((s) => s.key);
  if (new Set(keys).size !== 11 || keys.some((k) => !/^[A-Z]{2,4}$/.test(k))) throw new Error(`${name} : clés ${keys}`);

  // Liens : gardien ↔ défenseurs centraux ; voisins dans une ligne ; plus proche voisin entre lignes successives
  const links = new Set();
  const add = (a, b) => links.add([a.key, b.key].sort().join("|"));
  for (const d of rows[0]) if (Math.abs(d.x - 50) <= 25) add(slots[0], d);
  // Voisins d'une même ligne, sauf aux deux bouts du terrain (milieux excentrés d'un losange)
  for (const row of rows) for (let i = 0; i + 1 < row.length; i++) if (row[i + 1].x - row[i].x <= 30) add(row[i], row[i + 1]);
  for (let li = 0; li + 1 < rows.length; li++) {
    const [low, high] = [rows[li], rows[li + 1]];
    const nearest = (p, set) => set.reduce((b, o) => (Math.abs(o.x - p.x) < Math.abs(b.x - p.x) ? o : b));
    for (const p of high) add(p, nearest(p, low));
    for (const p of low) add(p, nearest(p, high));
  }
  const linkList = [...links].map((l) => l.split("|"));
  return { code, name, sortOrder, slots, links: linkList };
}

const built = FORMATIONS.map((f, i) => build(f, i + 1));
const q = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;
console.log(`-- =============================================================================
-- Draft : toutes les compositions classiques (${built.length}), générées par scripts/draft/formations.mjs.
-- Les compositions existantes (433, 442, 4231, 352) sont redessinées sur la même grille ; leurs clés de postes
-- restent compatibles (mêmes libellés), les drafts terminés gardent leurs joueurs.
-- =============================================================================
`);
for (const f of built) {
  console.log(`insert into public.draft_formations (code, name, sort_order, slots, links) values
  ('${f.code}', '${f.name}', ${f.sortOrder}, ${q(f.slots)}, ${q(f.links)})
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order,
  slots = excluded.slots, links = excluded.links;`);
}
