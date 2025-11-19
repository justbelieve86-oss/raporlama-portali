#!/usr/bin/env bash
set -euo pipefail

# Simple one-command dev starter for this monorepo
# - Starts backend on port 4000
# - Starts frontend on port 4321

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}▶ RaporlamaProject dev başlatılıyor...${NC}"

# Graceful shutdown
cleanup() {
  echo -e "\n${YELLOW}⏹ Dev sunucuları kapatılıyor...${NC}"
  kill ${BACKEND_PID:-} 2>/dev/null || true
  kill ${FRONTEND_PID:-} 2>/dev/null || true
}
trap cleanup INT TERM

# Check frontend env
if [[ ! -f "$ROOT_DIR/frontend/.env" ]]; then
  echo -e "${YELLOW}⚠ frontend/.env bulunamadı. .env.example'i kopyalayın ve değerleri doldurun.${NC}"
fi

# Start backend
echo -e "${GREEN}▶ Backend başlatılıyor (http://localhost:4000)...${NC}"
(cd backend && npm run start) &
BACKEND_PID=$!

# Give backend a moment
sleep 0.7

# Start frontend
echo -e "${GREEN}▶ Frontend başlatılıyor (http://localhost:4321)...${NC}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Dev sunucuları çalışıyor${NC}"
echo "Frontend: http://localhost:4321/"
echo "Backend:  http://localhost:4000/"
echo -e "${YELLOW}⌃ Ctrl+C ile her ikisini durdurabilirsiniz${NC}"

wait