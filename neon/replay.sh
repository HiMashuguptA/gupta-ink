#!/usr/bin/env bash
# Rebuild the Supabase-era schema on a local Postgres (port 5499) into database "replay".
set -e
cd "$(dirname "$0")/.."
P="psql -h /tmp -p 5499 -U postgres"
$P -q -c "drop database if exists replay" -c "create database replay" >/dev/null
$P -d replay -v ON_ERROR_STOP=1 -q -f neon/supabase_stubs.sql 2>&1 | grep -vE "WARNING|HINT" || true
for f in supabase/migrations/*.sql; do
  sed -E 's/^\s*create extension if not exists (pg_cron|pg_net|supabase_vault)[^;]*;//I' "$f" \
    | $P -d replay -v ON_ERROR_STOP=1 -q >/dev/null 2>/tmp/replay.err || { echo "FAIL $f"; head -5 /tmp/replay.err; exit 1; }
done
echo "replayed $(ls supabase/migrations/*.sql | wc -l) migrations"
