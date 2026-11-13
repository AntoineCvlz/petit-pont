-- =============================================================================
-- Discord : annonces d'ouverture réservées aux cartes Iconique et Spéciale
-- (les Légendaires restent dans le fil d'activité du site, mais ne sont plus postées sur Discord).
-- Libellé de rareté accentué et lien vers la fiche du joueur.
-- =============================================================================

create or replace function public._discord_rarity_label(p_rarity text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_rarity
    when 'commune' then 'Commune' when 'rare' then 'Rare' when 'epique' then 'Épique'
    when 'legendaire' then 'Légendaire' when 'iconique' then 'Iconique' when 'speciale' then 'Spéciale'
    else initcap(coalesce(p_rarity, ''))
  end;
$$;

create or replace function public._discord_on_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select username from public.profiles where id = new.user_id);
  v_player text;
  v_slug text;
  v_image text;
  v_rarity text;
  v_site text := coalesce(public.get_setting('site_url') #>> '{}', '');
begin
  if new.template_id is not null then
    select p.display_name, p.slug, coalesce(ct.image_url, p.image_url), ct.rarity::text
      into v_player, v_slug, v_image, v_rarity
    from public.card_templates ct join public.players p on p.id = ct.player_id where ct.id = new.template_id;
  end if;
  case new.type
    when 'rare_pull' then
      v_rarity := coalesce(new.payload ->> 'rarity', v_rarity);
      -- Seuil Discord : Iconique et mieux
      if public.rarity_rank(v_rarity::public.rarity) >= 5 then
        perform public._discord_announce(
          v_user || ' a tiré ' || v_player || ' !',
          '**' || public._discord_rarity_label(v_rarity) || '** n°' || coalesce(new.payload ->> 'serial_number', '?')
            || coalesce(' · ' || (new.payload ->> 'booster'), '')
            || case when v_site <> '' and v_slug is not null then E'\n' || v_site || '/wiki/' || v_slug else '' end,
          case v_rarity when 'speciale' then 5832650 else 15025000 end,
          v_image);
      end if;
    when 'album_completed' then
      perform public._discord_announce(v_user || ' a complété un album !',
        coalesce((select name from public.albums where id = new.album_id), 'Album'), 9425258);
    when 'big_sale' then
      perform public._discord_announce('Grosse vente au marché',
        v_user || ' a vendu ' || coalesce(v_player, 'une carte') || coalesce(' pour ' || (new.payload ->> 'price') || ' pièces', ''),
        16040523, v_image);
    else
      null;
  end case;
  return new;
exception when others then
  -- Une annonce ratée ne doit jamais bloquer le jeu
  return new;
end;
$$;
