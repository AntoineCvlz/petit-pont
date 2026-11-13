-- =============================================================================
-- Clans de joueurs : 20 membres max, un clan par joueur, fil de discussion (temps réel),
-- objectif collectif hebdomadaire (mêmes événements que les missions) récompensé par un pack
-- pour chaque membre ayant contribué.
-- =============================================================================

create table public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 30),
  tag text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  description text check (description is null or char_length(description) <= 200),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  is_open boolean not null default true,                  -- ouvert : adhésion libre ; fermé : code d'invitation
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  goals_completed int not null default 0,
  created_at timestamptz not null default now()
);
create unique index clans_name_lower_idx on public.clans (lower(name));
create unique index clans_tag_idx on public.clans (tag);

create table public.clan_members (
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

create table public.clan_messages (
  id bigint generated always as identity primary key,
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index clan_messages_clan_idx on public.clan_messages (clan_id, created_at desc);

create table public.clan_goals (
  clan_id uuid not null references public.clans (id) on delete cascade,
  week_start date not null,
  event text not null,
  title text not null,
  target int not null check (target > 0),
  progress int not null default 0,
  completed_at timestamptz,
  primary key (clan_id, week_start)
);

create table public.clan_contributions (
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  amount int not null default 0,
  primary key (clan_id, user_id, week_start)
);

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_messages enable row level security;
alter table public.clan_goals enable row level security;
alter table public.clan_contributions enable row level security;
grant select on public.clans, public.clan_members, public.clan_messages, public.clan_goals, public.clan_contributions to authenticated;

create function public._my_clan()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clan_id from public.clan_members where user_id = auth.uid();
$$;

-- Les clans et leurs membres sont publics (annuaire) ; discussion, objectif et contributions réservés aux membres
create policy "Annuaire" on public.clans for select to authenticated using (true);
create policy "Membres publics" on public.clan_members for select to authenticated using (true);
create policy "Discussion du clan" on public.clan_messages for select to authenticated
  using (clan_id = (select public._my_clan()) or (select public.is_admin()));
create policy "Objectif du clan" on public.clan_goals for select to authenticated
  using (clan_id = (select public._my_clan()) or (select public.is_admin()));
create policy "Contributions du clan" on public.clan_contributions for select to authenticated
  using (clan_id = (select public._my_clan()) or (select public.is_admin()));
-- Le code d'invitation ne se lit que via clan_detail (membres)
revoke select on public.clans from authenticated;
grant select (id, name, tag, description, owner_id, is_open, goals_completed, created_at) on public.clans to authenticated;

create trigger reject_banned_actor before insert on public.clan_messages
  for each row execute function public._reject_banned_actor();
create trigger reject_banned_actor before insert on public.clans
  for each row execute function public._reject_banned_actor();

-- Temps réel : nouveaux messages pour les membres (la RLS filtre les destinataires)
alter publication supabase_realtime add table public.clan_messages;

-- -----------------------------------------------------------------------------
-- Objectif hebdomadaire
-- -----------------------------------------------------------------------------
-- Objectif de la semaine : tourne selon le numéro de semaine, cible proportionnelle aux membres (au moins 3)
create function public._clan_goal(p_clan uuid)
returns public.clan_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date := public._period_start('weekly');
  g public.clan_goals%rowtype;
  v_members int;
  v_pick int;
begin
  select * into g from public.clan_goals where clan_id = p_clan and week_start = v_week;
  if found then
    return g;
  end if;
  select greatest(3, count(*)) into v_members from public.clan_members where clan_id = p_clan;
  v_pick := extract(week from v_week)::int % 5;
  insert into public.clan_goals (clan_id, week_start, event, title, target)
  select p_clan, v_week, e, t, b * v_members
  from (values (0, 'open_booster', 'Ouvrez des boosters', 6), (1, 'season_win', 'Gagnez des matchs de saison', 3),
               (2, 'sbc_complete', 'Réussissez des défis d''équipe', 1), (3, 'draft_complete', 'Terminez des drafts', 2),
               (4, 'penalty_play', 'Disputez des tournois de tirs au but', 2)) as x(i, e, t, b)
  where x.i = v_pick
  on conflict (clan_id, week_start) do nothing;
  select * into g from public.clan_goals where clan_id = p_clan and week_start = v_week;
  return g;
end;
$$;

create function public._clan_event(p_user uuid, p_event text, p_amount int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clan uuid;
  g public.clan_goals%rowtype;
begin
  select clan_id into v_clan from public.clan_members where user_id = p_user;
  if v_clan is null then
    return;
  end if;
  g := public._clan_goal(v_clan);
  if g.event <> p_event or g.completed_at is not null then
    return;
  end if;

  insert into public.clan_contributions (clan_id, user_id, week_start, amount) values (v_clan, p_user, g.week_start, p_amount)
  on conflict (clan_id, user_id, week_start) do update set amount = public.clan_contributions.amount + p_amount;
  update public.clan_goals set progress = least(target, progress + p_amount)
  where clan_id = v_clan and week_start = g.week_start
  returning * into g;

  if g.progress >= g.target and g.completed_at is null then
    update public.clan_goals set completed_at = now() where clan_id = v_clan and week_start = g.week_start;
    update public.clans set goals_completed = goals_completed + 1 where id = v_clan;
    -- Un pack pour chaque membre actuel ayant contribué cette semaine
    perform public._grant_boosters(c.user_id, 'standard', 1, 'Objectif de clan atteint : ' || g.title)
    from public.clan_contributions c
    join public.clan_members m on m.clan_id = c.clan_id and m.user_id = c.user_id
    where c.clan_id = v_clan and c.week_start = g.week_start and c.amount > 0;
  end if;
end;
$$;

-- Les événements des missions alimentent aussi l'objectif du clan
create or replace function public._mission_event(p_user uuid, p_event text, p_amount int default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.mission_progress (user_id, mission_id, period_start, progress)
  select p_user, m.id, public._period_start(m.period), least(m.target, p_amount)
  from public.missions m
  where m.is_active and m.event = p_event
  on conflict (user_id, mission_id, period_start) do update
  set progress = least((select target from public.missions where id = excluded.mission_id),
                       public.mission_progress.progress + p_amount);
  perform public._clan_event(p_user, p_event, p_amount);
end;
$$;

revoke execute on function public._my_clan() from public, anon;
revoke execute on function public._clan_goal(uuid) from public, anon, authenticated;
revoke execute on function public._clan_event(uuid, text, int) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create function public.create_clan(p_name text, p_tag text, p_description text, p_open boolean)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_tag text := upper(btrim(coalesce(p_tag, '')));
begin
  if v_uid is null then
    raise exception 'Connecte-toi pour jouer' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clan_members where user_id = v_uid) then
    raise exception 'Quitte d''abord ton clan actuel' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 3 and 30 or v_tag !~ '^[A-Z0-9]{2,4}$' then
    raise exception 'Nom : 3 à 30 caractères ; sigle : 2 à 4 lettres ou chiffres' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.banned_words w
             where position(w.word in lower(regexp_replace(v_name || v_tag, '[^a-zA-Z0-9]', '', 'g'))) > 0) then
    raise exception 'Ce nom n''est pas autorisé' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clans where lower(name) = lower(v_name)) or exists (select 1 from public.clans where tag = v_tag) then
    raise exception 'Nom ou sigle déjà pris' using errcode = 'P0001';
  end if;
  insert into public.clans (name, tag, description, owner_id, is_open)
  values (v_name, v_tag, nullif(left(btrim(coalesce(p_description, '')), 200), ''), v_uid, coalesce(p_open, true))
  returning id into v_id;
  insert into public.clan_members (clan_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end;
$$;

-- Rejoindre : clan ouvert (par son identifiant) ou fermé (par code d'invitation)
create function public.join_clan(p_clan uuid, p_code text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  c public.clans%rowtype;
begin
  if p_code is not null and btrim(p_code) <> '' then
    select * into c from public.clans where invite_code = upper(btrim(p_code)) for update;
  else
    select * into c from public.clans where id = p_clan for update;
    if found and not c.is_open then
      raise exception 'Ce clan est sur invitation : demande son code' using errcode = 'P0001';
    end if;
  end if;
  if c.id is null then
    raise exception 'Clan introuvable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clan_members where user_id = v_uid) then
    raise exception 'Quitte d''abord ton clan actuel' using errcode = 'P0001';
  end if;
  if (select count(*) from public.clan_members where clan_id = c.id) >= 20 then
    raise exception 'Clan complet (20 membres)' using errcode = 'P0001';
  end if;
  insert into public.clan_members (clan_id, user_id) values (c.id, v_uid);
  insert into public.clan_messages (clan_id, user_id, body)
  values (c.id, null, (select username from public.profiles where id = v_uid) || ' a rejoint le clan.');
  return c.id;
end;
$$;

create function public.leave_clan()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.clan_members%rowtype;
  v_next uuid;
begin
  select * into m from public.clan_members where user_id = v_uid for update;
  if not found then
    raise exception 'Tu n''es dans aucun clan' using errcode = 'P0001';
  end if;
  delete from public.clan_members where user_id = v_uid;
  if m.role = 'owner' then
    select user_id into v_next from public.clan_members where clan_id = m.clan_id order by joined_at limit 1;
    if v_next is null then
      delete from public.clans where id = m.clan_id;   -- dernier membre : le clan disparaît
      return;
    end if;
    update public.clan_members set role = 'owner' where clan_id = m.clan_id and user_id = v_next;
    update public.clans set owner_id = v_next where id = m.clan_id;
  end if;
  insert into public.clan_messages (clan_id, user_id, body)
  values (m.clan_id, null, (select username from public.profiles where id = v_uid) || ' a quitté le clan.');
end;
$$;

create function public.kick_clan_member(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_clan uuid;
begin
  select clan_id into v_clan from public.clan_members where user_id = auth.uid() and role = 'owner';
  if v_clan is null or p_user = auth.uid() then
    raise exception 'Réservé au chef du clan' using errcode = 'P0001';
  end if;
  delete from public.clan_members where clan_id = v_clan and user_id = p_user;
  if not found then
    raise exception 'Membre introuvable' using errcode = 'P0001';
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'clan', 'Tu as été retiré du clan', null, '/clans');
end;
$$;

create function public.update_clan(p_description text, p_open boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.clans set description = nullif(left(btrim(coalesce(p_description, '')), 200), ''), is_open = coalesce(p_open, is_open)
  where owner_id = auth.uid();
  if not found then
    raise exception 'Réservé au chef du clan' using errcode = 'P0001';
  end if;
end;
$$;

create function public.post_clan_message(p_body text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clan uuid := public._my_clan();
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_clan is null then
    raise exception 'Rejoins un clan pour discuter' using errcode = 'P0001';
  end if;
  if char_length(v_body) not between 1 and 500 then
    raise exception 'Message : 1 à 500 caractères' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clan_messages where user_id = v_uid and created_at > now() - interval '3 seconds') then
    raise exception 'Doucement : un message toutes les 3 secondes' using errcode = 'P0001';
  end if;
  insert into public.clan_messages (clan_id, user_id, body) values (v_clan, v_uid, v_body);
end;
$$;

create function public.delete_clan_message(p_message bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.clan_messages msg
  where msg.id = p_message
    and (msg.user_id = auth.uid()
         or exists (select 1 from public.clan_members m where m.clan_id = msg.clan_id and m.user_id = auth.uid() and m.role = 'owner'));
  if not found then
    raise exception 'Message introuvable' using errcode = 'P0001';
  end if;
end;
$$;

create function public.clan_detail(p_clan uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_member boolean := p_clan = public._my_clan();
  g public.clan_goals%rowtype;
begin
  if v_member then
    g := public._clan_goal(p_clan);
  end if;
  return (
    select jsonb_build_object(
      'id', c.id, 'name', c.name, 'tag', c.tag, 'description', c.description, 'owner_id', c.owner_id, 'is_open', c.is_open,
      'goals_completed', c.goals_completed, 'is_member', v_member,
      'invite_code', case when v_member then c.invite_code end,
      'members', (select jsonb_agg(jsonb_build_object(
                    'user_id', m.user_id, 'username', p.username, 'avatar_url', p.avatar_url, 'role', m.role,
                    'contribution', case when v_member then coalesce((select amount from public.clan_contributions cc
                       where cc.clan_id = c.id and cc.user_id = m.user_id and cc.week_start = g.week_start), 0) end)
                    order by m.role = 'owner' desc, m.joined_at)
                  from public.clan_members m join public.profiles p on p.id = m.user_id where m.clan_id = c.id),
      'goal', case when v_member then jsonb_build_object('title', g.title, 'event', g.event, 'target', g.target,
                                                          'progress', g.progress, 'completed', g.completed_at is not null,
                                                          'week_start', g.week_start) end)
    from public.clans c where c.id = p_clan);
end;
$$;

create function public.clan_list(p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'goals_completed' desc, x ->> 'members' desc), '[]')
  from (select jsonb_build_object('id', c.id, 'name', c.name, 'tag', c.tag, 'description', c.description, 'is_open', c.is_open,
               'goals_completed', c.goals_completed,
               'members', (select count(*) from public.clan_members m where m.clan_id = c.id)) as x
        from public.clans c order by c.goals_completed desc, c.created_at limit least(greatest(p_limit, 1), 200)) s;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['create_clan(text, text, text, boolean)', 'join_clan(uuid, text)', 'leave_clan()',
                           'kick_clan_member(uuid)', 'update_clan(text, boolean)', 'post_clan_message(text)',
                           'delete_clan_message(bigint)', 'clan_detail(uuid)', 'clan_list(int)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
