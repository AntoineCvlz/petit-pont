-- Totaux gagnés / dépensés du joueur connecté (évite de rapatrier tout le journal)
create function public.my_coin_totals()
returns table (earned bigint, spent bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount) filter (where amount > 0), 0)::bigint,
         coalesce(-sum(amount) filter (where amount < 0), 0)::bigint
  from public.coin_transactions
  where user_id = auth.uid()
$$;

revoke execute on function public.my_coin_totals() from public, anon;
grant execute on function public.my_coin_totals() to authenticated;
