#!/usr/bin/env bash
# =============================================================================
# Transparency Chain — Stop Script
# Usage:  bash stop.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'

echo -e "${YELLOW}Stopping Transparency Chain services...${RESET}"

stop_pid_file() {
  local file=$1 name=$2
  if [ -f "$file" ]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo -e "${GREEN}✔ Stopped $name (PID $pid)${RESET}"
    fi
    rm -f "$file"
  fi
}

stop_pid_file "$SCRIPT_DIR/.backend.pid"  "Backend"
stop_pid_file "$SCRIPT_DIR/.frontend.pid" "Frontend"

# Belt-and-braces: kill anything still on the ports
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}All services stopped.${RESET}"
