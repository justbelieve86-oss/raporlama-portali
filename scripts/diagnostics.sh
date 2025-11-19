#!/usr/bin/env bash
set -euo pipefail

echo "[DIAG] Frontend diagnostics..."
pushd frontend >/dev/null
  npm run diagnostics || echo "[DIAG] Frontend diagnostics encountered errors"
popd >/dev/null

echo "[DIAG] Backend diagnostics..."
pushd backend >/dev/null
  npm run diagnostics || echo "[DIAG] Backend diagnostics encountered errors"
popd >/dev/null

echo "[DIAG] Semgrep security scan (optional)..."
if command -v semgrep >/dev/null 2>&1; then
  semgrep --config p/ci || echo "[DIAG] Semgrep reported findings or errors"
else
  echo "[DIAG] Semgrep not installed; skipping security scan"
fi

echo "[DIAG] SQL/RLS checks..."
if [ -f backend/.env ]; then
  set -a
  . backend/.env
  set +a
  echo "[DIAG] Loaded backend/.env for Supabase scripts"
else
  echo "[DIAG] backend/.env not found; Supabase checks may fail"
fi
node scripts/verify-kpis.js || echo "[DIAG] verify-kpis reported issues"
node scripts/diagnose-rls.js || echo "[DIAG] diagnose-rls reported issues"

echo "[DIAG] Completed."