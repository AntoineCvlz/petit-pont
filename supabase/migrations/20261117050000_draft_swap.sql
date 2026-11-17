-- =============================================================================
-- Draft : échanger deux joueurs déjà choisis sur la même ligne (gardien, défense, milieu, attaque).
-- Le collectif (et, pour un draft terminé, le score) est recalculé par la base.
-- =============================================================================

create function public.draft_swap(p_draft_id uuid, p_slot_a text, p_slot_b text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  d public.drafts%rowtype;
  f public.draft_formations%rowtype;
  v_pos_a text;
  v_pos_b text;
  v_tpl_a int;
  v_tpl_b int;
  v_chem smallint;
begin
  select * into d from public.drafts where id = p_draft_id for update;
  if not found or d.user_id is distinct from v_uid then
    raise exception 'Draft introuvable' using errcode = 'P0001';
  end if;
  if d.status = 'abandoned' then
    raise exception 'Ce draft a été abandonné' using errcode = 'P0001';
  end if;
  if p_slot_a is null or p_slot_b is null or p_slot_a = p_slot_b then
    raise exception 'Choisis deux postes différents' using errcode = 'P0001';
  end if;

  select * into f from public.draft_formations where code = d.formation;
  select s ->> 'pos' into v_pos_a from jsonb_array_elements(f.slots) s where s ->> 'key' = p_slot_a;
  select s ->> 'pos' into v_pos_b from jsonb_array_elements(f.slots) s where s ->> 'key' = p_slot_b;
  if v_pos_a is null or v_pos_b is null then
    raise exception 'Poste inconnu' using errcode = 'P0001';
  end if;
  if v_pos_a <> v_pos_b then
    raise exception 'Échange possible uniquement entre joueurs de la même ligne' using errcode = 'P0001';
  end if;

  select template_id into v_tpl_a from public.draft_picks where draft_id = d.id and slot_key = p_slot_a;
  select template_id into v_tpl_b from public.draft_picks where draft_id = d.id and slot_key = p_slot_b;
  if v_tpl_a is null or v_tpl_b is null then
    raise exception 'Les deux postes doivent être pourvus' using errcode = 'P0001';
  end if;

  update public.draft_picks
  set template_id = case slot_key when p_slot_a then v_tpl_b else v_tpl_a end
  where draft_id = d.id and slot_key in (p_slot_a, p_slot_b);

  if d.status = 'completed' then
    v_chem := public._draft_chemistry(d.id);
    update public.drafts set chemistry = v_chem, score = round(rating + v_chem / 20.0, 2) where id = d.id;
  end if;
  return public._draft_state(d.id);
end;
$$;
revoke execute on function public.draft_swap(uuid, text, text) from public, anon;
grant execute on function public.draft_swap(uuid, text, text) to authenticated;
