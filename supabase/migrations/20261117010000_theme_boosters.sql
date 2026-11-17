-- =============================================================================
-- Boosters à thème : par championnat, par nation et par style de jeu (gestes techniques, mauvais pied,
-- vitesse…). Chaque booster porte une règle (pool_rule) ; sa réserve de cartes (booster_cards) est
-- recalculée par refresh_booster_pools(), appelée ici et à chaque import du catalogue.
-- =============================================================================

alter table public.boosters
  add column category text not null default 'classique'
    check (category in ('classique', 'championnat', 'nation', 'style')),
  add column pool_rule jsonb;

comment on column public.boosters.pool_rule is
  'Règle de réserve : {"league": "L1"} | {"nation": "FRA"} | {"skill_moves_min": 4} | {"weak_foot_min": 5} | '
  '{"stat": "pac", "stat_min": 88} | {"position": "ATT"} | {"max_age": 21} | {"rating_min": 70} (critères cumulables).';

-- Tirage : une réserve à thème peut n'avoir aucune carte d'une rareté (ex. aucune Commune chez les meilleurs
-- défenseurs). On descend d'abord (jamais sous p_floor_rank), puis on remonte au lieu d'échouer.
create or replace function public._pick_template(p_booster int, p_rarity public.rarity, p_floor_rank int default 1)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_has_pool boolean;
  v_start int := public.rarity_rank(p_rarity);
  v_rank int;
  v_tpl int;
begin
  -- Un booster à règle ne pioche que dans sa réserve, même vide (alors indisponible)
  select exists (select 1 from public.booster_cards where booster_id = p_booster)
      or exists (select 1 from public.boosters where id = p_booster and pool_rule is not null)
    into v_has_pool;

  for v_rank in select r from (
      select generate_series(v_start, p_floor_rank, -1) as r, 0 as pass
      union all
      select generate_series(v_start + 1, 6), 1
    ) s order by pass, case when pass = 0 then -r else r end
  loop
    select ct.id into v_tpl
    from public.card_templates ct
    where ct.is_active
      and public.rarity_rank(ct.rarity) = v_rank
      and (ct.max_supply is null or ct.minted_count < ct.max_supply)
      and (not v_has_pool or exists (
        select 1 from public.booster_cards bc where bc.booster_id = p_booster and bc.template_id = ct.id))
    order by random()
    limit 1;
    if v_tpl is not null then
      return v_tpl;
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public._pick_template(int, public.rarity, int) from public, anon, authenticated;

-- Réserve des boosters à règle : cartes actives dont le joueur / le club correspond à tous les critères
create function public.refresh_booster_pools()
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

-- Les boosters existants : catégorie « classique »
-- Nouveaux boosters (5 cartes, au moins une Rare, cotes du Booster Tribune)
insert into public.boosters (slug, name, description, kind, price, cards_count, guarantee_rarity, guarantee_count,
                             sort_order, category, pool_rule)
values
  ('ligue-1', 'Ligue 1', 'Uniquement des joueurs de Ligue 1.', 'standard', 300, 5, 'rare', 1, 20, 'championnat', '{"league": "L1"}'),
  ('premier-league', 'Premier League', 'Uniquement des joueurs de Premier League.', 'standard', 300, 5, 'rare', 1, 21, 'championnat', '{"league": "PL"}'),
  ('laliga', 'LaLiga', 'Uniquement des joueurs de LaLiga.', 'standard', 300, 5, 'rare', 1, 22, 'championnat', '{"league": "LL"}'),
  ('serie-a', 'Serie A', 'Uniquement des joueurs de Serie A.', 'standard', 300, 5, 'rare', 1, 23, 'championnat', '{"league": "SA"}'),
  ('bundesliga', 'Bundesliga', 'Uniquement des joueurs de Bundesliga.', 'standard', 300, 5, 'rare', 1, 24, 'championnat', '{"league": "BL"}'),
  ('saudi-pro-league', 'Saudi Pro League', 'Uniquement des joueurs du championnat saoudien.', 'standard', 300, 5, 'rare', 1, 25, 'championnat', '{"league": "SPL"}'),
  ('nation-france', 'France', 'Uniquement des joueurs français.', 'standard', 300, 5, 'rare', 1, 40, 'nation', '{"nation": "FRA"}'),
  ('nation-bresil', 'Brésil', 'Uniquement des joueurs brésiliens.', 'standard', 300, 5, 'rare', 1, 41, 'nation', '{"nation": "BRA"}'),
  ('nation-argentine', 'Argentine', 'Uniquement des joueurs argentins.', 'standard', 300, 5, 'rare', 1, 42, 'nation', '{"nation": "ARG"}'),
  ('nation-espagne', 'Espagne', 'Uniquement des joueurs espagnols.', 'standard', 300, 5, 'rare', 1, 43, 'nation', '{"nation": "ESP"}'),
  ('nation-angleterre', 'Angleterre', 'Uniquement des joueurs anglais.', 'standard', 300, 5, 'rare', 1, 44, 'nation', '{"nation": "ENG"}'),
  ('nation-portugal', 'Portugal', 'Uniquement des joueurs portugais.', 'standard', 300, 5, 'rare', 1, 45, 'nation', '{"nation": "POR"}'),
  ('nation-allemagne', 'Allemagne', 'Uniquement des joueurs allemands.', 'standard', 300, 5, 'rare', 1, 46, 'nation', '{"nation": "GER"}'),
  ('style-dribbleurs', 'Dribbleurs', 'Gestes techniques 4★ et plus.', 'standard', 450, 5, 'rare', 1, 60, 'style', '{"skill_moves_min": 4}'),
  ('style-ambidextres', 'Ambidextres', 'Mauvais pied 5★ : aussi à l''aise des deux pieds.', 'standard', 450, 5, 'rare', 1, 61, 'style', '{"weak_foot_min": 5}'),
  ('style-fusees', 'Fusées', 'Vitesse 88 et plus.', 'standard', 450, 5, 'rare', 1, 62, 'style', '{"stat": "pac", "stat_min": 88}'),
  ('style-buteurs', 'Buteurs', 'Attaquants avec un tir de 80 et plus.', 'standard', 450, 5, 'rare', 1, 63, 'style', '{"position": "ATT", "stat": "sho", "stat_min": 80}'),
  ('style-murailles', 'Murailles', 'Défenseurs avec une défense de 80 et plus.', 'standard', 450, 5, 'rare', 1, 64, 'style', '{"position": "DEF", "stat": "def", "stat_min": 80}'),
  ('style-gardiens', 'Derniers remparts', 'Uniquement des gardiens notés 70 et plus.', 'standard', 300, 5, 'rare', 1, 65, 'style', '{"position": "GB", "rating_min": 70}'),
  ('style-pepites', 'Pépites', 'Joueurs de 21 ans et moins, notés 70 et plus.', 'standard', 400, 5, 'rare', 1, 66, 'style', '{"max_age": 21, "rating_min": 70}')
on conflict (slug) do nothing;

insert into public.booster_odds (booster_id, rarity, probability)
select b.id, o.rarity::public.rarity, o.p
from public.boosters b
cross join (values ('commune', 62.00), ('rare', 26.00), ('epique', 9.00), ('legendaire', 2.30), ('iconique', 0.60), ('speciale', 0.10))
  as o(rarity, p)
where b.pool_rule is not null
on conflict do nothing;

select public.refresh_booster_pools();
