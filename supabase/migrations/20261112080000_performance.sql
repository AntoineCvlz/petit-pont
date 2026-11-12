-- =============================================================================
-- Phase 9 — Index complémentaires
-- Clés étrangères parcourues lors des suppressions en cascade / mises à null
-- (purge des comptes de démo) et requêtes fréquentes non couvertes.
-- =============================================================================

-- « Mes annonces » et plafond d'annonces actives par vendeur
create index if not exists market_listings_seller_idx on public.market_listings (seller_id, status);
create index if not exists market_listings_buyer_idx on public.market_listings (buyer_id) where buyer_id is not null;

-- Ventes : historique par joueur et mises à null à la suppression d'un compte
create index if not exists market_sales_seller_idx on public.market_sales (seller_id);
create index if not exists market_sales_buyer_idx on public.market_sales (buyer_id);
create index if not exists market_sales_listing_idx on public.market_sales (listing_id);

-- Historique des exemplaires
create index if not exists card_instance_history_from_idx on public.card_instance_history (from_user_id) where from_user_id is not null;
create index if not exists card_instance_history_to_idx on public.card_instance_history (to_user_id) where to_user_id is not null;

-- Échanges : éléments par exemplaire (revérification, propositions caduques) et par joueur
create index if not exists trade_items_instance_idx on public.trade_items (instance_id);
create index if not exists trade_items_from_user_idx on public.trade_items (from_user_id);
create index if not exists trades_parent_idx on public.trades (parent_trade_id) where parent_trade_id is not null;
create index if not exists trades_pending_expiry_idx on public.trades (expires_at) where status = 'pending';

-- Fil d'activité par joueur, recherches, signalements, blocages
create index if not exists activity_feed_user_idx on public.activity_feed (user_id, created_at desc);
create index if not exists market_searches_user_idx on public.market_searches (user_id, created_at desc);
create index if not exists market_searches_template_idx on public.market_searches (template_id, created_at desc) where template_id is not null;
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reported_idx on public.reports (reported_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- Vitrine et ouvertures
create index if not exists profile_showcase_instance_idx on public.profile_showcase (instance_id);
create index if not exists booster_openings_booster_idx on public.booster_openings (booster_id);
create index if not exists album_completions_album_idx on public.album_completions (album_id);
create index if not exists album_slots_template_idx on public.album_slots (template_id);
