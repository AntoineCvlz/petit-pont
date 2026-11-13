-- =============================================================================
-- Draft : avec un catalogue de plusieurs milliers de cartes, le tirage pondéré par carte était dominé par le
-- nombre de Communes. On tire désormais chaque rareté selon une part fixe, quel que soit son nombre de cartes
-- (Rare 35 %, Épique 30 %, Légendaire 20 %, Iconique 10 %, Spéciale 5 %), et sans les Communes.
-- =============================================================================
create or replace function public._draft_offer(p_draft_id uuid, p_position public.player_position)
returns int[]
language sql
volatile
security definer
set search_path = ''
as $$
  with candidates as (
    select ct.id, ct.player_id, ct.rarity
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    where ct.is_active and p.position = p_position and ct.rarity <> 'commune'
      and ct.player_id not in (
        select t.player_id from public.draft_picks dp join public.card_templates t on t.id = dp.template_id
        where dp.draft_id = p_draft_id)
  ), weighted as (
    select id, player_id,
           -ln(1 - random()) * count(*) over (partition by rarity) / case rarity
             when 'rare' then 35 when 'epique' then 30 when 'legendaire' then 20
             when 'iconique' then 10 else 5 end as k
    from candidates
  ), one_per_player as (
    select distinct on (player_id) id, k from weighted order by player_id, k
  )
  select coalesce(array_agg(id order by k), '{}') from (select id, k from one_per_player order by k limit 5) s;
$$;
