// Lecture du fichier joueurs (CSV, une ligne par joueur) et normalisation commune aux scripts d'import.
import { readFileSync } from "node:fs";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((k, i) => [k, r[i]])));
}

/** Joueurs masculins du fichier (choix du porteur du projet). */
export function loadPlayers(path) {
  return parseCsv(readFileSync(path, "utf8")).filter((r) => r.gender === "Men's Football");
}

export const normalize = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[łŁ]/g, "l")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const slugify = (s) => normalize(s).replace(/ /g, "-");

export function displayName(r) {
  return (r.common_name || `${r.first_name} ${r.last_name}`).trim();
}
