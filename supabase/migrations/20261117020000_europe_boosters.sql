-- =============================================================================
-- Boosters « Coupes d'Europe » : joueurs des clubs de la phase de championnat 2026-27 de la Ligue des
-- champions, de la Ligue Europa et de la Ligue Conférence (liste des 36 participants de chaque compétition ;
-- les clubs absents du catalogue sont ignorés). Nouvelle clé de règle : {"clubs": ["PSG", …]}.
-- =============================================================================

alter table public.boosters drop constraint boosters_category_check;
alter table public.boosters add constraint boosters_category_check
  check (category in ('classique', 'europe', 'championnat', 'nation', 'style'));

comment on column public.boosters.pool_rule is
  'Règle de réserve : {"league": "L1"} | {"nation": "FRA"} | {"clubs": ["PSG", "OM"]} | {"skill_moves_min": 4} | '
  '{"weak_foot_min": 5} | {"stat": "pac", "stat_min": 88} | {"position": "ATT"} | {"max_age": 21} | {"rating_min": 70} '
  '(critères cumulables).';

create or replace function public.refresh_booster_pools()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b record;
  v_total int := 0;
  v_n int;
begin
  for b in select id, pool_rule as r from public.boosters where pool_rule is not null loop
    delete from public.booster_cards where booster_id = b.id;
    insert into public.booster_cards (booster_id, template_id)
    select b.id, ct.id
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    join public.nations n on n.id = p.nation_id
    left join public.clubs c on c.id = ct.club_id
    left join public.leagues l on l.id = c.league_id
    where ct.is_active
      and (b.r ->> 'league' is null or l.code = b.r ->> 'league')
      and (b.r ->> 'nation' is null or n.code = b.r ->> 'nation')
      and (b.r -> 'clubs' is null or c.code in (select jsonb_array_elements_text(b.r -> 'clubs')))
      and (b.r ->> 'position' is null or p.position::text = b.r ->> 'position')
      and (b.r ->> 'skill_moves_min' is null or p.skill_moves >= (b.r ->> 'skill_moves_min')::int)
      and (b.r ->> 'weak_foot_min' is null or p.weak_foot >= (b.r ->> 'weak_foot_min')::int)
      and (b.r ->> 'rating_min' is null or ct.rating >= (b.r ->> 'rating_min')::int)
      and (b.r ->> 'max_age' is null or p.birthdate > current_date - make_interval(years => (b.r ->> 'max_age')::int + 1))
      and (b.r ->> 'stat' is null or (p.stats ->> (b.r ->> 'stat'))::int >= (b.r ->> 'stat_min')::int);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
  end loop;
  return v_total;
end;
$$;
revoke execute on function public.refresh_booster_pools() from public, anon, authenticated;

insert into public.boosters (slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count,
                             sort_order, category, pool_rule)
values
  ('ligue-des-champions', 'Ligue des champions',
   'Joueurs des clubs de la phase de championnat 2026-27 de la Ligue des champions.',
   'standard', 450, 5, 'rare', 1, 10, 'europe',
   '{"clubs": ["PSG","FCBY","RMA","LIV","INT","MCI","ARS","FCB","ATM","BVB","ROM","SPORTING-CP","ASTON-VILLA","FC-PORTO","MUN","CLUB-BRUGGE","REAL-BETIS","PSV","FEYENOORD","LOSC-LILLE","FK-BODO-GLIMT","NAP","RBL","VILLARREAL-CF","FEN","SHAKHTAR-DONETSK","GAL","SLAVIA-PRAHA","VFB-STUTTGART","AEK-ATHENS","LASK","COMO","RC-LENS","VIKING-FK"]}'),
  ('ligue-europa', 'Ligue Europa',
   'Joueurs des clubs de la phase de championnat 2026-27 de la Ligue Europa.',
   'standard', 350, 5, 'rare', 1, 11, 'europe',
   '{"clubs": ["LEVERKUSEN","SL-BENFICA","JUV","ACM","OL","AZ","OLYMPIACOS-FC","RSO","OM","FERENCVAROSI-TC","VIKTORIA-PLZEN","R-UNION-ST-G","DINAMO-ZAGREB","SAL","CELTIC","SPARTA-PRAHA","STADE-RENNAIS-FC","RSC-ANDERLECHT","SK-STURM-GRAZ","LECH-POZNAN","CRY","AFC-BOURNEMOUTH","SUNDERLAND","JAGIELLONIA","OMONIA-FC","CELTA","TSG-HOFFENHEIM","BJK","N-E-C-NIJMEGEN","LILLESTROM-SK"]}'),
  ('ligue-conference', 'Ligue Conférence',
   'Joueurs des clubs de la phase de championnat 2026-27 de la Ligue Conférence.',
   'standard', 300, 5, 'rare', 1, 12, 'europe',
   '{"clubs": ["ATA","SC-BRAGA","AJX","SC-FREIBURG","ASM","F-C-KOBENHAVN","FC-MIDTJYLLAND","KAA-GENT","PANATHINAIKOS","BHA","FC-LUGANO","GETAFE-CF","FC-TWENTE","STVV","SK-BRANN","HEARTS","TRA","UNIV-CRAIOVA","HAJDUK-SPLIT","FC-NORDSJAELLAND","AGF","FC-THUN","MJALLBY-AIF"]}')
on conflict (slug) do nothing;

insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from public.boosters b
cross join (values ('commune', 62.00), ('rare', 26.00), ('epique', 9.00), ('legendaire', 2.30), ('iconique', 0.60), ('speciale', 0.10))
  as o(rarity, p)
where b.category = 'europe'
on conflict do nothing;

select public.refresh_booster_pools();
