-- =============================================================================
-- Édition « Signature » : version Spéciale (10 exemplaires) des Iconiques dont la vraie signature est disponible
-- sous licence libre (Wikimedia Commons, domaine public ; fichiers dans public/media/signatures, scripts/media/
-- signatures.mjs). Jamais de signature imitée : un joueur sans fichier n'a pas de carte Signature.
-- =============================================================================

alter table public.players add column signature_url text
  check (signature_url is null or signature_url ~ '^/media/signatures/[a-z0-9-]+\.png$');

-- Crée (une seule fois) la carte Signature de chaque joueur concerné, d'après sa meilleure carte Iconique.
-- Appelée ici (production) et en fin de seed (base locale, où les joueurs arrivent après les migrations).
create function public._ensure_signature_cards()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  update public.players p
  set signature_url = '/media/signatures/' || p.slug || '.png'
  where p.slug in ('pele', 'maradona', 'messi', 'cristiano-ronaldo', 'ronaldinho', 'mbappe', 'dembele')
    and p.signature_url is null;

  insert into public.card_templates (player_id, club_id, season, edition, rarity, rating, collection_number, max_supply)
  select src.player_id, src.club_id, src.season, 'Signature', 'speciale', least(99, src.rating + 1),
         (select coalesce(max(collection_number), 0) from public.card_templates) + row_number() over (order by src.rating desc, src.player_id),
         10
  from (
    select distinct on (ct.player_id) ct.player_id, ct.club_id, ct.season, ct.rating
    from public.card_templates ct
    join public.players p on p.id = ct.player_id
    where p.signature_url is not null and ct.rarity = 'iconique' and ct.is_active
      and not exists (select 1 from public.card_templates s where s.player_id = ct.player_id and s.edition = 'Signature')
    order by ct.player_id, ct.rating desc
  ) src;
  get diagnostics v_n = row_count;

  if v_n > 0 then
    perform public.refresh_booster_pools();
  end if;
  return v_n;
end;
$$;
revoke execute on function public._ensure_signature_cards() from public, anon, authenticated;

select public._ensure_signature_cards();
