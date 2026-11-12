/**
 * Nations disposant d'un vrai drapeau dans public/media/flags/<code>.svg
 * (fichiers du paquet flag-icons, licence MIT ; les drapeaux nationaux eux-mêmes sont libres).
 * Les autres nations gardent le drapeau stylisé généré à partir de leurs couleurs.
 */
const FLAG_CODES = new Set([
  "ALG", "ARG", "BEL", "BRA", "CAN", "CIV", "CMR", "COL", "CRO", "DEN", "EGY", "ENG", "ESP", "FRA", "GAB", "GEO",
  "GER", "HUN", "ITA", "JPN", "KOR", "MAR", "NED", "NGA", "NOR", "POL", "POR", "SEN", "SRB", "SWE", "TUR", "URU",
]);

export function flagUrl(code: string): string | null {
  return FLAG_CODES.has(code) ? `/media/flags/${code}.svg` : null;
}
