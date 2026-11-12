-- =============================================================================
-- Petit Pont — schéma initial (Phase 1)
-- Toutes les tables de la spec, RLS activée partout, fonctions internes
-- (_apply_coins, _mint_card) non exposées aux clients.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type public.rarity as enum ('commune', 'rare', 'epique', 'legendaire', 'iconique', 'speciale');
create type public.player_position as enum ('GB', 'DEF', 'MIL', 'ATT');
create type public.booster_kind as enum ('free', 'standard', 'premium', 'event', 'limited');
create type public.album_kind as enum ('competition', 'club', 'nation', 'season', 'legends');
create type public.coin_tx_type as enum (
  'starting_balance', 'daily_bonus', 'booster_purchase', 'duplicate_sale',
  'market_sale', 'market_purchase', 'album_reward', 'trade_sent', 'trade_received',
  'admin_adjustment'
);
create type public.listing_status as enum ('active', 'sold', 'cancelled');
create type public.trade_status as enum ('pending', 'accepted', 'declined', 'cancelled', 'expired', 'countered');
create type public.activity_type as enum ('rare_pull', 'album_completed', 'big_sale', 'leaderboard_top10');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- Rang numérique d'une rareté (pour tris et comparaisons)
create function public.rarity_rank(r public.rarity)
returns int
language sql immutable parallel safe
set search_path = ''
as $$
  select case r
    when 'commune' then 1 when 'rare' then 2 when 'epique' then 3
    when 'legendaire' then 4 when 'iconique' then 5 when 'speciale' then 6
  end
$$;

-- -----------------------------------------------------------------------------
-- Paramètres du jeu (configurables par l'admin)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value, description) values
  ('starting_balance',      '1000',  'Solde de départ d''un nouveau joueur'),
  ('free_booster_hours',    '8',     'Délai entre deux boosters gratuits (heures)'),
  ('daily_bonus',           '100',   'Bonus de connexion quotidien'),
  ('market_fee_percent',    '5',     'Commission prélevée sur les ventes du marché (%)'),
  ('trade_expiry_days',     '7',     'Expiration automatique des échanges (jours)'),
  ('big_sale_threshold',    '2000',  'Montant à partir duquel une vente apparaît dans le fil'),
  ('duplicate_sell_prices', '{"commune":10,"rare":30,"epique":80,"legendaire":250,"iconique":600,"speciale":1500}',
                            'Prix de revente des doublons au système, par rareté');

create function public.get_setting(p_key text)
returns jsonb
language sql stable
security definer
set search_path = ''
as $$
  select value from public.app_settings where key = p_key
$$;

-- -----------------------------------------------------------------------------
-- Référentiel football
-- -----------------------------------------------------------------------------
create table public.nations (
  id smallint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z]{3}$'),
  name text not null,
  -- Drapeau stylisé (pas d'image réelle) : couleurs + disposition
  flag_colors text[] not null,
  flag_layout text not null default 'v' check (flag_layout in ('v', 'h', 'nordic', 'cross', 'disc'))
);

create table public.clubs (
  id smallint generated always as identity primary key,
  code text not null unique,
  name text not null,
  short_name text not null,
  city text,
  nation_id smallint references public.nations (id),
  color_primary text not null default '#1f3b2d',
  color_secondary text not null default '#e8efe9',
  crest_url text -- écusson générique remplaçable
);

create table public.players (
  id int generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  first_name text,
  last_name text not null,
  display_name text not null,
  nation_id smallint not null references public.nations (id),
  position public.player_position not null,
  birth_year smallint,
  is_legend boolean not null default false,
  bio text,
  image_url text
);
create index players_nation_idx on public.players (nation_id);

create table public.player_clubs (
  player_id int not null references public.players (id) on delete cascade,
  club_id smallint not null references public.clubs (id),
  start_year smallint,
  end_year smallint,
  primary key (player_id, club_id)
);

-- -----------------------------------------------------------------------------
-- Cartes
-- -----------------------------------------------------------------------------
create table public.card_templates (
  id int generated always as identity primary key,
  player_id int not null references public.players (id) on delete cascade,
  club_id smallint references public.clubs (id),
  season text not null,             -- ex. « Saison 2026 », « Légende »
  edition text not null,            -- ex. « Base », « Étoile montante »
  rarity public.rarity not null,
  rating smallint not null check (rating between 40 and 99),
  collection_number int not null unique check (collection_number > 0),
  max_supply int check (max_supply is null or max_supply > 0), -- tirage limité
  minted_count int not null default 0 check (minted_count >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint minted_within_supply check (max_supply is null or minted_count <= max_supply)
);
create index card_templates_player_idx on public.card_templates (player_id);
create index card_templates_rarity_idx on public.card_templates (rarity);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_.-]{3,20}$'),
  avatar_url text,
  coins bigint not null default 0 check (coins >= 0),
  is_demo boolean not null default false,
  is_admin boolean not null default false,
  hide_activity boolean not null default false,
  sound_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  last_free_booster_at timestamptz,
  last_daily_bonus_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.card_instances (
  id uuid primary key default gen_random_uuid(),
  template_id int not null references public.card_templates (id),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  serial_number int not null check (serial_number > 0),
  obtained_via text not null default 'booster',
  is_locked boolean not null default false, -- en vente ou engagé dans un échange
  obtained_at timestamptz not null default now(),
  unique (template_id, serial_number)
);
create index card_instances_owner_idx on public.card_instances (owner_id, template_id);
create index card_instances_template_idx on public.card_instances (template_id);

create table public.card_instance_history (
  id bigint generated always as identity primary key,
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  event text not null, -- minted, market_sale, trade, …
  from_user_id uuid references public.profiles (id) on delete set null,
  to_user_id uuid references public.profiles (id) on delete set null,
  price bigint,
  created_at timestamptz not null default now()
);
create index card_instance_history_instance_idx on public.card_instance_history (instance_id, created_at);

create table public.profile_showcase (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  primary key (user_id, slot),
  unique (user_id, instance_id)
);

-- -----------------------------------------------------------------------------
-- Économie
-- -----------------------------------------------------------------------------
create table public.coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  type public.coin_tx_type not null,
  description text,
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);
create index coin_transactions_user_idx on public.coin_transactions (user_id, created_at desc);

-- Journal immuable (sauf purge explicite des comptes de démo par l'admin)
create function public.coin_transactions_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('petit_pont.allow_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'Le journal des pièces est immuable';
end;
$$;

create trigger coin_transactions_no_update
  before update or delete on public.coin_transactions
  for each row execute function public.coin_transactions_immutable();

-- -----------------------------------------------------------------------------
-- Boosters
-- -----------------------------------------------------------------------------
create table public.boosters (
  id int generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  kind public.booster_kind not null,
  price int not null default 0 check (price >= 0),
  cards_count smallint not null check (cards_count between 1 and 20),
  -- Garantie : au moins `guarantee_count` cartes de rareté >= `guarantee_rarity`
  guarantee_rarity public.rarity,
  guarantee_count smallint not null default 0 check (guarantee_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  stock_total int check (stock_total is null or stock_total > 0),
  stock_remaining int check (stock_remaining is null or stock_remaining >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint booster_free_is_free check (kind <> 'free' or price = 0),
  constraint booster_event_dates check (kind <> 'event' or (starts_at is not null and ends_at is not null and ends_at > starts_at)),
  constraint booster_limited_stock check (kind <> 'limited' or (stock_total is not null and stock_remaining is not null and stock_remaining <= stock_total)),
  constraint booster_guarantee check (guarantee_count <= cards_count and (guarantee_count = 0 or guarantee_rarity is not null))
);

create table public.booster_odds (
  booster_id int not null references public.boosters (id) on delete cascade,
  rarity public.rarity not null,
  probability numeric(5, 2) not null check (probability >= 0 and probability <= 100),
  primary key (booster_id, rarity)
);

-- Total des probabilités = 100 % (vérifié en fin de transaction)
create function public.check_booster_odds_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_booster int := coalesce(new.booster_id, old.booster_id);
  v_total numeric;
begin
  if not exists (select 1 from public.boosters where id = v_booster) then
    return null;
  end if;
  select coalesce(sum(probability), 0) into v_total from public.booster_odds where booster_id = v_booster;
  if v_total <> 100 then
    raise exception 'Les probabilités du booster % totalisent % %% au lieu de 100 %%', v_booster, v_total;
  end if;
  return null;
end;
$$;

create constraint trigger booster_odds_total
  after insert or update or delete on public.booster_odds
  deferrable initially deferred
  for each row execute function public.check_booster_odds_total();

-- Pool restreint optionnel : si vide, toutes les cartes actives sont tirables
create table public.booster_cards (
  booster_id int not null references public.boosters (id) on delete cascade,
  template_id int not null references public.card_templates (id) on delete cascade,
  primary key (booster_id, template_id)
);

create table public.booster_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  booster_id int not null references public.boosters (id),
  price_paid int not null default 0,
  instance_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index booster_openings_user_idx on public.booster_openings (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Albums
-- -----------------------------------------------------------------------------
create table public.albums (
  id int generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  kind public.album_kind not null,
  reward_coins int not null default 0 check (reward_coins >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.album_slots (
  id int generated always as identity primary key,
  album_id int not null references public.albums (id) on delete cascade,
  slot_number smallint not null check (slot_number > 0),
  template_id int not null references public.card_templates (id) on delete cascade,
  unique (album_id, slot_number),
  unique (album_id, template_id)
);

create table public.album_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  album_id int not null references public.albums (id) on delete cascade,
  reward_coins int not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, album_id)
);

-- -----------------------------------------------------------------------------
-- Marché
-- -----------------------------------------------------------------------------
create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  template_id int not null references public.card_templates (id),
  price bigint not null check (price > 0),
  status public.listing_status not null default 'active',
  buyer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index market_listings_one_active_per_instance on public.market_listings (instance_id) where status = 'active';
create index market_listings_active_idx on public.market_listings (status, created_at desc);
create index market_listings_template_idx on public.market_listings (template_id, status);

create table public.market_sales (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.market_listings (id) on delete cascade,
  template_id int not null references public.card_templates (id),
  seller_id uuid references public.profiles (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  price bigint not null,
  fee bigint not null default 0,
  created_at timestamptz not null default now()
);
create index market_sales_template_idx on public.market_sales (template_id, created_at desc);

create table public.market_searches (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  query text,
  template_id int references public.card_templates (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Échanges
-- -----------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  proposer_coins bigint not null default 0 check (proposer_coins >= 0),
  recipient_coins bigint not null default 0 check (recipient_coins >= 0),
  message text check (char_length(message) <= 280),
  status public.trade_status not null default 'pending',
  parent_trade_id uuid references public.trades (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  resolved_at timestamptz,
  constraint trade_not_self check (proposer_id <> recipient_id)
);
create index trades_proposer_idx on public.trades (proposer_id, status);
create index trades_recipient_idx on public.trades (recipient_id, status);

create table public.trade_items (
  trade_id uuid not null references public.trades (id) on delete cascade,
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (trade_id, instance_id)
);

create table public.wishlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_id int not null references public.card_templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);
create index wishlists_template_idx on public.wishlists (template_id);

-- -----------------------------------------------------------------------------
-- Communauté
-- -----------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.activity_feed (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.activity_type not null,
  template_id int references public.card_templates (id) on delete cascade,
  album_id int references public.albums (id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_feed_created_idx on public.activity_feed (created_at desc);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint report_not_self check (reporter_id <> reported_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint block_not_self check (blocker_id <> blocked_id)
);

create table public.banned_words (
  word text primary key check (word = lower(word))
);

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires
-- -----------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Validation d'un pseudo : format + mots interdits. Renvoie null si OK, sinon le message.
create function public.username_problem(p_username text)
returns text
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_clean text := lower(regexp_replace(coalesce(p_username, ''), '[^a-zA-Z0-9]', '', 'g'));
begin
  if p_username is null or p_username !~ '^[A-Za-z0-9_.-]{3,20}$' then
    return 'Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, « _ », « . » ou « - »).';
  end if;
  if exists (select 1 from public.banned_words w where position(w.word in v_clean) > 0) then
    return 'Ce pseudo n''est pas autorisé.';
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(p_username)) then
    return 'Ce pseudo est déjà pris.';
  end if;
  return null;
end;
$$;

-- Mouvement de pièces : seul point d'entrée qui modifie profiles.coins.
-- Verrouille le profil, refuse un solde négatif, journalise avec le solde résultant.
create function public._apply_coins(
  p_user uuid,
  p_amount bigint,
  p_type public.coin_tx_type,
  p_description text default null,
  p_ref_type text default null,
  p_ref_id text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  if p_amount = 0 then
    select coins into v_balance from public.profiles where id = p_user;
    return v_balance;
  end if;

  select coins into v_balance from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Profil introuvable';
  end if;
  if v_balance + p_amount < 0 then
    raise exception 'Solde insuffisant' using errcode = 'P0001';
  end if;

  v_balance := v_balance + p_amount;
  update public.profiles set coins = v_balance where id = p_user;
  insert into public.coin_transactions (user_id, amount, balance_after, type, description, ref_type, ref_id)
  values (p_user, p_amount, v_balance, p_type, p_description, p_ref_type, p_ref_id);
  return v_balance;
end;
$$;

-- Création d'un exemplaire : verrouille le modèle, respecte le tirage limité,
-- attribue le numéro de série suivant et historise.
create function public._mint_card(p_template int, p_owner uuid, p_via text default 'booster')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tpl public.card_templates%rowtype;
  v_id uuid;
begin
  select * into v_tpl from public.card_templates where id = p_template for update;
  if not found then
    raise exception 'Carte introuvable';
  end if;
  if v_tpl.max_supply is not null and v_tpl.minted_count >= v_tpl.max_supply then
    raise exception 'Tirage épuisé pour cette carte';
  end if;

  update public.card_templates set minted_count = minted_count + 1 where id = p_template;

  insert into public.card_instances (template_id, owner_id, serial_number, obtained_via)
  values (p_template, p_owner, v_tpl.minted_count + 1, p_via)
  returning id into v_id;

  insert into public.card_instance_history (instance_id, event, to_user_id)
  values (v_id, 'minted', p_owner);

  return v_id;
end;
$$;

-- Fonctions internes : jamais appelables par les clients
revoke execute on function public._apply_coins(uuid, bigint, public.coin_tx_type, text, text, text) from public, anon, authenticated;
revoke execute on function public._mint_card(int, uuid, text) from public, anon, authenticated;
revoke execute on function public.get_setting(text) from public, anon;
grant execute on function public.get_setting(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Inscription : création du profil + solde de départ journalisé
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  -- is_demo vient de raw_app_meta_data (non modifiable par l'utilisateur à l'inscription)
  v_is_demo boolean := coalesce((new.raw_app_meta_data ->> 'is_demo')::boolean, false);
  v_problem text;
  v_start bigint;
begin
  v_problem := public.username_problem(v_username);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;

  insert into public.profiles (id, username, is_demo) values (new.id, v_username, v_is_demo);

  v_start := coalesce((public.get_setting('starting_balance'))::bigint, 0);
  if v_start > 0 then
    perform public._apply_coins(new.id, v_start, 'starting_balance', 'Solde de bienvenue');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Changement de pseudo (validé côté serveur)
create function public.update_username(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problem text;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and lower(username) = lower(p_username)) then
    update public.profiles set username = p_username where id = auth.uid();
    return;
  end if;
  v_problem := public.username_problem(p_username);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;
  update public.profiles set username = p_username where id = auth.uid();
end;
$$;

revoke execute on function public.update_username(text) from public, anon;
grant execute on function public.update_username(text) to authenticated;
revoke execute on function public.username_problem(text) from public;
grant execute on function public.username_problem(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Vue d'audit : le solde doit toujours correspondre au journal
-- -----------------------------------------------------------------------------
create view public.coin_balance_audit
with (security_invoker = true)
as
select p.id as user_id,
       p.username,
       p.coins,
       coalesce(sum(t.amount), 0)::bigint as journal_total,
       p.coins = coalesce(sum(t.amount), 0) as is_consistent
from public.profiles p
left join public.coin_transactions t on t.user_id = p.id
group by p.id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.nations enable row level security;
alter table public.clubs enable row level security;
alter table public.players enable row level security;
alter table public.player_clubs enable row level security;
alter table public.card_templates enable row level security;
alter table public.profiles enable row level security;
alter table public.card_instances enable row level security;
alter table public.card_instance_history enable row level security;
alter table public.profile_showcase enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.boosters enable row level security;
alter table public.booster_odds enable row level security;
alter table public.booster_cards enable row level security;
alter table public.booster_openings enable row level security;
alter table public.albums enable row level security;
alter table public.album_slots enable row level security;
alter table public.album_completions enable row level security;
alter table public.market_listings enable row level security;
alter table public.market_sales enable row level security;
alter table public.market_searches enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_feed enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.banned_words enable row level security;

-- Par défaut, aucun droit d'écriture direct pour les clients : on retire tout,
-- puis on n'accorde que la lecture et quelques écritures non sensibles.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- Référentiel : lecture publique
create policy "Lecture publique" on public.app_settings for select to anon, authenticated using (true);
create policy "Lecture publique" on public.nations for select to anon, authenticated using (true);
create policy "Lecture publique" on public.clubs for select to anon, authenticated using (true);
create policy "Lecture publique" on public.players for select to anon, authenticated using (true);
create policy "Lecture publique" on public.player_clubs for select to anon, authenticated using (true);
create policy "Lecture publique" on public.card_templates for select to anon, authenticated using (true);
create policy "Lecture publique" on public.boosters for select to anon, authenticated using (true);
create policy "Lecture publique" on public.booster_odds for select to anon, authenticated using (true);
create policy "Lecture publique" on public.booster_cards for select to anon, authenticated using (true);
create policy "Lecture publique" on public.albums for select to anon, authenticated using (true);
create policy "Lecture publique" on public.album_slots for select to anon, authenticated using (true);

-- Données joueurs visibles par les joueurs connectés (profils publics, collections)
create policy "Lecture joueurs connectés" on public.profiles for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.card_instances for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.card_instance_history for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.profile_showcase for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.album_completions for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.market_listings for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.market_sales for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.wishlists for select to authenticated using (true);
create policy "Lecture joueurs connectés" on public.activity_feed for select to authenticated using (true);

-- Données privées
create policy "Mes transactions" on public.coin_transactions for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes ouvertures" on public.booster_openings for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes recherches" on public.market_searches for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes signalements" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "Mes blocages" on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "Échanges me concernant" on public.trades for select to authenticated
  using ((select auth.uid()) in (proposer_id, recipient_id));
create policy "Échanges me concernant" on public.trade_items for select to authenticated
  using (exists (select 1 from public.trades t where t.id = trade_id and (select auth.uid()) in (t.proposer_id, t.recipient_id)));

-- Écritures directes autorisées (non sensibles)
grant update (avatar_url, hide_activity, sound_enabled, reduced_motion) on public.profiles to authenticated;
create policy "Modifier mon profil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant update (is_read) on public.notifications to authenticated;
create policy "Marquer mes notifications" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant insert, delete on public.wishlists to authenticated;
create policy "Gérer ma liste de souhaits" on public.wishlists for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Retirer de ma liste de souhaits" on public.wishlists for delete to authenticated using (user_id = (select auth.uid()));

-- Vue d'audit : admin uniquement
revoke all on public.coin_balance_audit from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime (utilisé à partir des phases marché / échanges / notifications)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications, public.market_listings, public.boosters, public.trades;
