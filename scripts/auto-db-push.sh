#!/usr/bin/env bash

set -euo pipefail

# Usage:
#  scripts/auto-db-push.sh
#
# Tries to apply Supabase migrations automatically using local CLI.
# - Requires ./bin/supabase to exist (already present in repo)
# - Prefers remote push via `supabase link` if SUPABASE_ACCESS_TOKEN and project ref are available
# - Falls back to local dev (`supabase start` then `db push`) if not linked

SUPABASE_BIN="$(dirname "$0")/../bin/supabase"
ROOT_DIR="$(dirname "$0")/.."

if [ ! -x "$SUPABASE_BIN" ]; then
  echo "Supabase CLI not found at $SUPABASE_BIN or not executable."
  exit 1
fi

cd "$ROOT_DIR"

echo "==> Attempting remote link & push"
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  "$SUPABASE_BIN" link --project-ref "$SUPABASE_PROJECT_REF" || true
  "$SUPABASE_BIN" db push && exit 0
  echo "Remote db push failed; will try local dev push."
else
  echo "No SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in env; skipping remote push."
fi

echo "==> Starting local Supabase (if not already running)"
"$SUPABASE_BIN" start || true

echo "==> Applying migrations to local dev database"
"$SUPABASE_BIN" db push

echo "==> Done."