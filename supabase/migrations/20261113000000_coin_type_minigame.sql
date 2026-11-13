-- Récompenses des mini-jeux (tirs au but) : nouveau type de mouvement de pièces.
-- Migration séparée : une valeur d'énumération ne peut pas servir dans la transaction qui la crée.
alter type public.coin_tx_type add value if not exists 'minigame_reward';
