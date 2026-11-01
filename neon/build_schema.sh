#!/usr/bin/env bash
# Builds neon/schema.sql: the shop's database for Neon, converted from supabase/migrations.
set -e
cd "$(dirname "$0")/.."
P="psql -h /tmp -p 5499 -U postgres"
./neon/replay.sh
$P -d replay -v ON_ERROR_STOP=1 -q -f neon/convert.sql
pg_dump -h /tmp -p 5499 -U postgres -d replay -n public --schema-only --no-owner --no-comments \
  | grep -vE '^SET transaction_timeout' \
  | grep -vE '^(GRANT|REVOKE) .* (TO|FROM) (service_role|postgres|PUBLIC);$' \
  | grep -vE '^ALTER DEFAULT PRIVILEGES' \
  | grep -vE '^CREATE SCHEMA public;|^COMMENT ON SCHEMA public' \
  | sed -E 's/auth\.uid\(\)/public.uid()/g; s/extensions\./public./g; s/vault\.decrypted_secrets/private.secrets/g; s/vault\.secrets/private.secrets/g' \
  | sed -E 's/ (TO|FROM) anon;$/ \1 anonymous;/; s/ TO anon,/ TO anonymous,/; s/, anon;$/, anonymous;/; s/ TO anon USING/ TO anonymous USING/' \
  | sed -E 's/\bTO anon\b/TO anonymous/g; s/\banon, authenticated\b/anonymous, authenticated/g; s/\bauthenticated, anon\b/authenticated, anonymous/g' \
  > /tmp/neon_body.sql
{ cat neon/prelude.sql; cat /tmp/neon_body.sql; cat neon/extras.sql; } > neon/schema.sql
echo "wrote neon/schema.sql ($(wc -l < neon/schema.sql) lines)"
