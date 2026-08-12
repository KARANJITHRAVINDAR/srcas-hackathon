#!/usr/bin/env bash
# =============================================================================
# Transparency Chain — Project Starter
# Double-click this file or run:  bash start.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_LOG="$SCRIPT_DIR/backend.log"
FRONTEND_LOG="$SCRIPT_DIR/frontend.log"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║          TRANSPARENCY CHAIN — STARTUP SCRIPT         ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo -e "${RESET}"
}

step()  { echo -e "${YELLOW}▶ $1${RESET}"; }
ok()    { echo -e "${GREEN}✔ $1${RESET}"; }
fail()  { echo -e "${RED}✘ $1${RESET}"; }
info()  { echo -e "  ${CYAN}$1${RESET}"; }

# ── Kill anything already on the ports ───────────────────────────────────────
clear_port() {
  local port=$1
  local pid
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    step "Freeing port $port (PID $pid)..."
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# ── Wait for an HTTP endpoint to respond ─────────────────────────────────────
wait_for() {
  local url=$1 label=$2 max=${3:-60} i=0
  step "Waiting for $label to be ready..."
  while ! curl -sf "$url" -o /dev/null 2>/dev/null; do
    sleep 2; i=$((i+2))
    echo -n "."
    if [ $i -ge $max ]; then
      echo ""
      fail "$label did not start within ${max}s. Check logs:"
      info "$BACKEND_LOG  /  $FRONTEND_LOG"
      exit 1
    fi
  done
  echo ""
  ok "$label is ready!"
}

# ─────────────────────────────────────────────────────────────────────────────
banner

# ── 0. Check prerequisites ───────────────────────────────────────────────────
step "Checking prerequisites..."
command -v java   >/dev/null 2>&1 || { fail "Java not found. Install JDK 17+."; exit 1; }
command -v mvn    >/dev/null 2>&1 || { fail "Maven not found."; exit 1; }
command -v node   >/dev/null 2>&1 || { fail "Node.js not found."; exit 1; }
command -v mysql  >/dev/null 2>&1 || { fail "MySQL/MariaDB CLI not found."; exit 1; }
ok "All prerequisites found"

# ── 1. Check database ────────────────────────────────────────────────────────
step "Checking MariaDB connection..."
if mysql -u root -proot -e "SELECT 1;" >/dev/null 2>&1; then
  ok "Database connection OK"
else
  fail "Cannot connect to MariaDB as root/root. Start MariaDB first."
  exit 1
fi

# ── 2. Apply schema patches (idempotent) ─────────────────────────────────────
step "Applying schema patches (enum updates, new columns)..."
mysql -u root -proot transparency_chain 2>/dev/null <<'SQL'
  -- projects.status: ensure PUBLISHED is present
  SELECT COLUMN_TYPE INTO @ctype FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='transparency_chain' AND TABLE_NAME='projects' AND COLUMN_NAME='status';
  SET @needs_pub = IF(INSTR(@ctype, 'PUBLISHED') = 0, 1, 0);
  SET @sql = IF(@needs_pub,
    "ALTER TABLE projects MODIFY COLUMN status ENUM('DRAFT','PUBLISHED','ESCROWED','IN_PROGRESS','COMPLETED','FLAGGED','CANCELLED')",
    "SELECT 'projects.status already patched'");
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

  -- milestones.status: ensure new lifecycle statuses are present
  SELECT COLUMN_TYPE INTO @mtype FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='transparency_chain' AND TABLE_NAME='milestones' AND COLUMN_NAME='status';
  SET @needs_ms = IF(INSTR(@mtype, 'LOCKED') = 0, 1, 0);
  SET @msql = IF(@needs_ms,
    "ALTER TABLE milestones MODIFY COLUMN status ENUM('PENDING','IN_REVIEW','VERIFIED','REJECTED','MODIFIED','LOCKED','IN_PROGRESS','EVIDENCE_SUBMITTED','TICKET_RAISED','UNDER_REVIEW','ACCEPTED','DISBURSED','CLOSED') NULL",
    "SELECT 'milestones.status already patched'");
  PREPARE mstmt FROM @msql; EXECUTE mstmt; DEALLOCATE PREPARE mstmt;

  -- milestones.funder_id: ensure nullable
  ALTER TABLE projects MODIFY COLUMN funder_id uuid NULL;
SQL
ok "Schema patches applied"

# ── 3. Start backend ─────────────────────────────────────────────────────────
clear_port 8081
step "Starting Spring Boot backend..."
cd "$BACKEND_DIR"
nohup mvn spring-boot:run -q > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"
cd "$SCRIPT_DIR"

wait_for_post() {
  local url=$1 label=$2 max=${3:-90} i=0
  step "Waiting for $label to be ready..."
  while ! curl -sf -X POST "$url" -H "Content-Type: application/json" \
      -d '{"email":"dummyfunder@demo.com","password":"demo"}' -o /dev/null 2>/dev/null; do
    sleep 2; i=$((i+2)); echo -n "."
    if [ $i -ge $max ]; then
      echo ""
      fail "$label did not start within ${max}s. Check logs:"
      info "$BACKEND_LOG  /  $FRONTEND_LOG"
      exit 1
    fi
  done
  echo ""
  ok "$label is ready!"
}
wait_for_post "http://localhost:8081/api/v1/auth/login" "Backend (port 8081)" 90

# ── 4. Start frontend ────────────────────────────────────────────────────────
clear_port 5173
step "Starting React frontend (Vite)..."
cd "$FRONTEND_DIR"
nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/.frontend.pid"
cd "$SCRIPT_DIR"

wait_for "http://localhost:5173" "Frontend (port 5173)" 60

# ── 5. Done ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║               TRANSPARENCY CHAIN IS UP!              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Frontend  →  http://localhost:5173                  ║"
echo "║  Backend   →  http://localhost:8081                  ║"
echo "║  API Docs  →  http://localhost:8081/api/org/projects ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  To verify everything works:  bash verify.sh         ║"
echo "║  To stop all services:        bash stop.sh           ║"
echo "║  Backend log:  tail -f backend.log                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"
