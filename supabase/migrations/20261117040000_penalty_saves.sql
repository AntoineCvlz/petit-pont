-- Tirs au but : plonger du bon côté arrête le tir dans la grande majorité des cas (90 % à notes égales,
-- de 80 à 97 % selon l'écart gardien / tireur) ; avant, 40 à 80 %, ce qui donnait l'impression d'un bug.
create or replace function public._penalty_outcome(p_shooter_rating int, p_keeper_rating int, p_direction text, p_dive text)
returns text
language sql
volatile
set search_path = ''
as $$
  select case
    when random() > least(0.95, greatest(0.75, 0.85 + (p_shooter_rating - 80) * 0.01)) then 'missed'
    when p_direction = p_dive
         and random() < least(0.97, greatest(0.80, 0.90 + (p_keeper_rating - p_shooter_rating) * 0.005)) then 'saved'
    else 'goal'
  end;
$$;
