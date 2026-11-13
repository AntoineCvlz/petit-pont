// Génère le SQL d'import du catalogue joueurs (fichier CSV fourni par le porteur du projet, NON versionné).
// Idempotent : relancer après une mise à jour du fichier met à jour notes, clubs et étoiles.
//   node scripts/fc27/build-sql.mjs <players.csv>          → scripts/fc27/out/import.sql
//   psql … -v ON_ERROR_STOP=1 -f scripts/fc27/out/import.sql
// Effets : nations, ligues et clubs manquants créés ; joueurs existants rapprochés (nom + année de naissance)
// et complétés ; nouveaux joueurs créés ; cartes de base « Saison 2026-27 » créées ; anciennes cartes de base
// « Saison 2026 » retirées des tirages (les exemplaires possédés restent) ; albums de clubs créés.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { displayName, loadPlayers, normalize, slugify } from "./csv.mjs";
import { CLUB_CODES, CLUB_NAMES, LEAGUES, NATIONS, PLAYER_MATCHES, POSITIONS, rarityFor } from "./referentiel.mjs";

const dir = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage : node scripts/fc27/build-sql.mjs <players.csv>");
  process.exit(1);
}
export const SEASON = "Saison 2026-27";
const OLD_SEASON = "Saison 2026";

const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;
const players = loadPlayers(csvPath);

// --- Clubs : clé ligue|club (un même nom peut exister dans deux ligues)
const clubs = new Map();
const usedCodes = new Set(Object.values(CLUB_CODES));
for (const r of players) {
  const key = `${r.league}|${r.club}`;
  if (clubs.has(key)) continue;
  let code = CLUB_CODES[r.club];
  if (!code || [...clubs.values()].some((c) => c.code === code)) {
    const base = slugify(r.club).toUpperCase().slice(0, 24) || "CLUB";
    code = base;
    for (let k = 2; usedCodes.has(code); k++) code = `${base}-${k}`;
  }
  usedCodes.add(code);
  const name = CLUB_NAMES[r.club] ?? r.club;
  clubs.set(key, { code, name, short: name.length > 18 ? name.slice(0, 18).trim() : name, league: LEAGUES[r.league][0] });
}

// --- Joueurs : slugs uniques dans le fichier
const slugCount = new Map();
for (const r of players) {
  const s = slugify(displayName(r));
  slugCount.set(s, (slugCount.get(s) ?? 0) + 1);
}
const photos = existsSync(`${dir}out/photo-sources.json`) ? JSON.parse(readFileSync(`${dir}out/photo-sources.json`, "utf8")) : {};
const hasPhoto = (id) => photos[id] && existsSync(`${root}public/media/players/fc${id}.webp`);

const statKeys = (gk) => (gk ? ["div", "han", "kic", "ref", "spd", "pos"] : ["pac", "sho", "pas", "dri", "def", "phy"]);
const rows = players.map((r) => {
  const name = displayName(r);
  const base = slugify(name);
  const gk = r.position === "GK";
  const facets = [r.pace, r.shooting, r.passing, r.dribbling, r.defending, r.physicality].map(Number);
  const stats = Object.fromEntries(statKeys(gk).map((k, i) => [k, facets[i]]));
  const rating = Number(r.overall_rating);
  return [
    Number(r.player_id),
    q(slugCount.get(base) > 1 ? `${base}-${r.player_id}` : base),
    q(r.first_name || null),
    q(r.last_name || name),
    q(name),
    q(normalize(name)),
    q(normalize(`${r.first_name} ${r.last_name}`)),
    q(NATIONS[r.nationality][0]),
    q(POSITIONS[r.position]),
    q(r.position),
    arr(r.alternate_positions.split(" ").filter(Boolean)),
    q(r.birthdate),
    q(r.preferred_foot === "Left" ? "Gauche" : "Droit"),
    Number(r.weak_foot),
    Number(r.skill_moves),
    q(JSON.stringify(stats)),
    rating,
    q(rarityFor(rating)),
    q(clubs.get(`${r.league}|${r.club}`).code),
    hasPhoto(r.player_id) ? q(`/media/players/fc${r.player_id}.webp`) : "null",
  ].join(",");
});

const sql = [];
sql.push(`-- Généré par scripts/fc27/build-sql.mjs (${players.length} joueurs) — ne pas versionner.
\\set ON_ERROR_STOP on
begin;
set local statement_timeout = 0;

-- Nations
create temp table fc_nations (code text, name text) on commit drop;
insert into fc_nations values
${Object.values(NATIONS)
  .map(([c, n]) => `(${q(c)},${q(n)})`)
  .join(",\n")};
insert into public.nations (code, name, flag_colors, flag_layout)
select code, name, array['#41524a', '#dfe6e1'], 'h' from fc_nations
on conflict (code) do nothing;

-- Ligues
create temp table fc_leagues (code text, name text, short text, nation text, sort int) on commit drop;
insert into fc_leagues values
${Object.values(LEAGUES)
  .map(([c, n, s, na, o]) => `(${q(c)},${q(n)},${q(s)},${q(na)},${o})`)
  .join(",\n")};
insert into public.leagues (code, name, short_name, nation_id, sort_order)
select l.code, l.name, l.short, (select id from public.nations where code = l.nation), l.sort from fc_leagues l
on conflict (code) do update set sort_order = excluded.sort_order,
  nation_id = coalesce(public.leagues.nation_id, excluded.nation_id);

-- Clubs (ceux déjà présents gardent nom, couleurs et écusson ; leur ligue est mise à jour)
create temp table fc_clubs (code text, name text, short text, league text) on commit drop;
insert into fc_clubs values
${[...clubs.values()].map((c) => `(${q(c.code)},${q(c.name)},${q(c.short)},${q(c.league)})`).join(",\n")};
insert into public.clubs (code, name, short_name, nation_id, league_id)
select c.code, c.name, c.short, l.nation_id, l.id
from fc_clubs c join public.leagues l on l.code = c.league
on conflict (code) do update set league_id = excluded.league_id;

-- Joueurs du fichier
create temp table fc_players (
  ext_id int primary key, slug text, first_name text, last_name text, display_name text, norm text, norm_full text,
  nation text, position public.player_position, position_detail text, alt_positions text[], birthdate date,
  preferred_foot text, weak_foot smallint, skill_moves smallint, stats jsonb, rating smallint, rarity public.rarity,
  club text, image_url text
) on commit drop;`);
for (let i = 0; i < rows.length; i += 500) {
  sql.push(
    `insert into fc_players values\n${rows
      .slice(i, i + 500)
      .map((r) => `(${r})`)
      .join(",\n")};`,
  );
}
sql.push(`
-- Rapprochements manuels, puis automatiques (hors légendes) : même nom normalisé, même année de naissance
update public.players p set ext_id = m.ext_id
from (values ${Object.entries(PLAYER_MATCHES)
  .map(([s, id]) => `(${q(s)}, ${id})`)
  .join(", ")}) as m(slug, ext_id)
where p.slug = m.slug and p.ext_id is null and exists (select 1 from fc_players f where f.ext_id = m.ext_id)
  and not exists (select 1 from public.players x where x.ext_id = m.ext_id);
with existing as (
  select p.id, p.birth_year,
         btrim(regexp_replace(lower(extensions.unaccent(p.display_name)), '[^a-z0-9]+', ' ', 'g')) as norm,
         btrim(regexp_replace(lower(extensions.unaccent(coalesce(p.first_name || ' ', '') || p.last_name)), '[^a-z0-9]+', ' ', 'g')) as norm_full
  from public.players p
  where p.ext_id is null and not p.is_legend
), pairs as (
  select distinct on (e.id) e.id, f.ext_id
  from existing e
  join fc_players f on extract(year from f.birthdate) = e.birth_year
   and (f.norm in (e.norm, e.norm_full) or f.norm_full in (e.norm, e.norm_full))
  where not exists (select 1 from public.players x where x.ext_id = f.ext_id)
  order by e.id, f.rating desc
)
update public.players p set ext_id = pairs.ext_id from pairs where p.id = pairs.id;

-- Fiche détaillée (joueurs rapprochés et déjà importés)
update public.players p set
  birthdate = f.birthdate, birth_year = extract(year from f.birthdate)::smallint, position = f.position,
  position_detail = f.position_detail, alt_positions = f.alt_positions, preferred_foot = f.preferred_foot,
  weak_foot = f.weak_foot, skill_moves = f.skill_moves, stats = f.stats,
  image_url = coalesce(p.image_url, f.image_url)
from fc_players f where p.ext_id = f.ext_id;

-- Nouveaux joueurs
insert into public.players (ext_id, slug, first_name, last_name, display_name, nation_id, position, birth_year, birthdate,
  position_detail, alt_positions, preferred_foot, weak_foot, skill_moves, stats, image_url)
select f.ext_id,
       case when exists (select 1 from public.players x where x.slug = f.slug) then f.slug || '-' || f.ext_id else f.slug end,
       f.first_name, f.last_name, f.display_name, n.id, f.position, extract(year from f.birthdate)::smallint, f.birthdate,
       f.position_detail, f.alt_positions, f.preferred_foot, f.weak_foot, f.skill_moves, f.stats, f.image_url
from fc_players f join public.nations n on n.code = f.nation
where not exists (select 1 from public.players x where x.ext_id = f.ext_id);

-- Club actuel
insert into public.player_clubs (player_id, club_id)
select p.id, c.id from fc_players f
join public.players p on p.ext_id = f.ext_id
join public.clubs c on c.code = f.club
on conflict do nothing;

-- Cartes de base de la saison : mise à jour (note, club) puis création des manquantes
update public.card_templates t set rating = f.rating, club_id = c.id
from fc_players f join public.players p on p.ext_id = f.ext_id join public.clubs c on c.code = f.club
where t.player_id = p.id and t.season = '${SEASON}' and t.edition = 'Base';

insert into public.card_templates (player_id, club_id, season, edition, rarity, rating, collection_number, max_supply)
select p.id, c.id, '${SEASON}', 'Base', f.rarity, f.rating,
       (select coalesce(max(collection_number), 0) from public.card_templates)
         + row_number() over (order by f.rating desc, f.display_name, f.ext_id),
       case f.rarity when 'legendaire' then 100 else null end
from fc_players f
join public.players p on p.ext_id = f.ext_id
join public.clubs c on c.code = f.club
where not exists (
  select 1 from public.card_templates t where t.player_id = p.id and t.season = '${SEASON}' and t.edition = 'Base');

-- Anciennes cartes de base : plus tirables (exemplaires possédés, marché et échanges inchangés)
update public.card_templates set is_active = false where season = '${OLD_SEASON}' and edition = 'Base' and is_active;
update public.albums set is_active = false
where slug in ('saison-2026', 'paris-saint-germain', 'real-madrid', 'equipe-de-france') and is_active;

-- Albums de la saison : un par club des cinq grands championnats + Équipe de France
insert into public.albums (slug, name, description, kind, reward_coins, sort_order)
select '2027-' || lower(c.code), c.name, 'L''effectif ' || c.name || ' de la saison 2026-27.', 'club', 800,
       100 + l.sort_order * 30 + row_number() over (partition by l.id order by c.name)
from public.clubs c join public.leagues l on l.id = c.league_id
where l.code in ('L1', 'PL', 'LL', 'SA', 'BL')
  and exists (select 1 from public.card_templates t where t.club_id = c.id and t.season = '${SEASON}')
on conflict (slug) do nothing;
insert into public.albums (slug, name, description, kind, reward_coins, sort_order)
values ('2027-equipe-de-france', 'Équipe de France', 'Les Bleus notés 75 et plus, saison 2026-27.', 'nation', 1500, 99)
on conflict (slug) do nothing;

insert into public.album_slots (album_id, slot_number, template_id)
select a.id,
       (select coalesce(max(slot_number), 0) from public.album_slots s where s.album_id = a.id)
         + row_number() over (partition by a.id order by t.rating desc, t.collection_number),
       t.id
from public.albums a
join public.clubs c on a.slug = '2027-' || lower(c.code)
join public.card_templates t on t.club_id = c.id and t.season = '${SEASON}' and t.edition = 'Base'
where not exists (select 1 from public.album_slots s where s.album_id = a.id and s.template_id = t.id);

insert into public.album_slots (album_id, slot_number, template_id)
select a.id,
       (select coalesce(max(slot_number), 0) from public.album_slots s where s.album_id = a.id)
         + row_number() over (order by t.rating desc, t.collection_number),
       t.id
from public.albums a
join public.card_templates t on t.season = '${SEASON}' and t.edition = 'Base' and t.rating >= 75
join public.players p on p.id = t.player_id
join public.nations n on n.id = p.nation_id and n.code = 'FRA'
where a.slug = '2027-equipe-de-france'
  and not exists (select 1 from public.album_slots s where s.album_id = a.id and s.template_id = t.id);

select
  (select count(*) from public.players where ext_id is not null) as joueurs_importes,
  (select count(*) from public.card_templates where season = '${SEASON}') as cartes_saison,
  (select count(*) from public.card_templates where is_active) as cartes_tirables,
  (select count(*) from public.players where ext_id is not null and image_url is not null) as avec_photo;
commit;
`);

writeFileSync(`${dir}out/import.sql`, sql.join("\n"));
console.log(
  `scripts/fc27/out/import.sql : ${players.length} joueurs, ${clubs.size} clubs, ${Object.keys(LEAGUES).length} ligues`,
);
