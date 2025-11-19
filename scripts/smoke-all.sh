#!/usr/bin/env bash
set -euo pipefail

echo "[SMOKE] Backend health"
(cd backend && npm run -s smoke:health)

echo "[SMOKE] Backend /me"
(cd backend && npm run -s smoke:me)

echo "[SMOKE] Frontend /login"
(cd frontend && npm run -s smoke)

echo "[SMOKE] ALL PASS"