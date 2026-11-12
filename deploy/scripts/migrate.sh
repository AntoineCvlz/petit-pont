#!/bin/sh
# Applique les migrations de supabase/migrations non encore jouées (table compatible avec la CLI
# Supabase), chacune dans une transaction avec son enregistrement. Puis, si SEED=1 et que le
# catalogue est vide, charge supabase/seed.sql (comptes de démo compris).
set -eu

export PGHOST=db PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -X -v ON_ERROR_STOP=1 -q"

$PSQL <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=0
for file in /migrations/*.sql; do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  done_already=$($PSQL -tAc "select 1 from supabase_migrations.schema_migrations where version = '$version'")
  if [ "$done_already" = "1" ]; then
    continue
  fi
  echo "→ migration $base"
  tmp=$(mktemp)
  cat "$file" > "$tmp"
  printf "\ninsert into supabase_migrations.schema_migrations (version, name) values ('%s', '%s');\n" "$version" "$name" >> "$tmp"
  $PSQL --single-transaction -f "$tmp"
  rm -f "$tmp"
  applied=$((applied + 1))
done
echo "Migrations appliquées : $applied"

if [ "${SEED:-0}" = "1" ]; then
  templates=$($PSQL -tAc "select count(*) from public.card_templates")
  if [ "$templates" = "0" ]; then
    echo "→ seed (catalogue, boosters, albums, comptes de démo, admin)"
    $PSQL --single-transaction -f /seed.sql
  else
    echo "Seed ignoré : le catalogue contient déjà $templates cartes."
  fi
fi
