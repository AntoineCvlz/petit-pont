-- =============================================================================
-- Nationalités sportives recoupées avec Wikidata (P1532) : Aubameyang joue pour le Gabon.
-- Ne s'applique qu'à une base déjà peuplée (production) ; le seed contient directement la correction.
-- =============================================================================

do $$
begin
  if not exists (select 1 from public.card_templates) then
    return;
  end if;

  insert into public.nations (code, name, flag_colors, flag_layout)
  values ('GAB', 'Gabon', '{#009E60,#FCD116,#3A75C4}', 'h')
  on conflict (code) do nothing;

  update public.players
  set nation_id = (select id from public.nations where code = 'GAB')
  where slug = 'aubameyang';

  -- Album « Équipe de France » : retire les cartes des joueurs qui ne sont plus français, renumérote
  delete from public.album_slots s
  using public.albums a, public.card_templates ct, public.players p
  where s.album_id = a.id and a.slug = 'equipe-de-france' and ct.id = s.template_id and p.id = ct.player_id
    and p.nation_id is distinct from (select id from public.nations where code = 'FRA');

  with numbered as (
    select s.id, row_number() over (order by ct.collection_number) as n
    from public.album_slots s
    join public.albums a on a.id = s.album_id
    join public.card_templates ct on ct.id = s.template_id
    where a.slug = 'equipe-de-france'
  )
  update public.album_slots s set slot_number = 20000 + n from numbered where numbered.id = s.id;
  update public.album_slots s set slot_number = slot_number - 20000
  from public.albums a
  where a.id = s.album_id and a.slug = 'equipe-de-france' and s.slot_number > 20000;
end;
$$;
