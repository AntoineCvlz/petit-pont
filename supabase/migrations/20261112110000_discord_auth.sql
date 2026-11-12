-- =============================================================================
-- Connexion Discord : le profil est créé sans formulaire d'inscription.
-- Inscription par e-mail (dev / tests) : pseudo choisi et validé, refus explicite si invalide.
-- Connexion Discord (OAuth) : pseudo dérivé du profil Discord (nom affiché, puis identifiant),
-- nettoyé, rendu unique au besoin ; modifiable ensuite depuis /profil.
-- =============================================================================

-- Pseudo valide et libre à partir d'un nom quelconque (jamais d'erreur)
create function public._username_from(p_candidates text[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw text;
  v_base text;
  v_try text;
begin
  foreach v_raw in array coalesce(p_candidates, '{}')
  loop
    -- Retire le suffixe historique « #0 » / « #1234 » et les caractères non autorisés
    v_base := regexp_replace(regexp_replace(coalesce(v_raw, ''), '#[0-9]+$', ''), '[^A-Za-z0-9_.-]', '', 'g');
    v_base := left(v_base, 20);
    continue when length(v_base) < 3;
    if public.username_problem(v_base) is null then
      return v_base;
    end if;
    -- Pseudo pris (pas interdit) : suffixe numérique
    if public.username_problem(v_base) = 'Ce pseudo est déjà pris.' then
      for i in 1..30 loop
        v_try := left(v_base, 15) || (1000 + floor(random() * 9000))::int;
        if public.username_problem(v_try) is null then
          return v_try;
        end if;
      end loop;
    end if;
  end loop;

  loop
    v_try := 'Joueur' || (100000 + floor(random() * 900000))::int;
    if public.username_problem(v_try) is null then
      return v_try;
    end if;
  end loop;
end;
$$;

revoke execute on function public._username_from(text[]) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text := v_meta ->> 'username';
  -- is_demo / is_admin viennent de raw_app_meta_data (non modifiable par l'utilisateur à l'inscription)
  v_is_demo boolean := coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false);
  v_is_admin boolean := coalesce((new.raw_app_meta_data ->> 'is_admin')::boolean, false);
  v_problem text;
  v_start bigint;
begin
  if v_username is not null then
    -- Inscription par e-mail : pseudo choisi par le joueur, validé strictement
    v_problem := public.username_problem(v_username);
    if v_problem is not null then
      raise exception '%', v_problem using errcode = 'P0001';
    end if;
  else
    -- Connexion OAuth (Discord) : nom affiché, identifiant, puis partie locale de l'e-mail
    v_username := public._username_from(array[
      v_meta -> 'custom_claims' ->> 'global_name',
      v_meta ->> 'full_name',
      v_meta ->> 'name',
      v_meta ->> 'user_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ]);
  end if;

  insert into public.profiles (id, username, is_demo, is_admin) values (new.id, v_username, v_is_demo, v_is_admin);

  v_start := coalesce((public.get_setting('starting_balance'))::bigint, 0);
  if v_start > 0 then
    perform public._apply_coins(new.id, v_start, 'starting_balance', 'Solde de bienvenue');
  end if;
  return new;
end;
$$;
