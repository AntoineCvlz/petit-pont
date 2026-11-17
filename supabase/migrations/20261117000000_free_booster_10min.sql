-- Booster gratuit toutes les 10 minutes (au lieu de 8 heures), décision du porteur du projet.
-- Le réglage est en heures (numérique) : 10 min = 1/6 h.
update public.app_settings
set value = to_jsonb(round(10 / 60.0, 10)), updated_at = now()
where key = 'free_booster_hours';

update public.boosters
set description = 'Trois cartes offertes toutes les 10 minutes. Repasse au vestiaire !'
where slug = 'gratuit' and description like 'Trois cartes offertes%';
