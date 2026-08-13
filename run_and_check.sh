#!/usr/bin/env bash
# =============================================================================
# Transparency Chain — Control & Verification Panel
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info() { echo -e "${YELLOW}▶ $1${RESET}"; }
ok() { echo -e "${GREEN}✔ $1${RESET}"; }
error() { echo -e "${RED}✘ $1${RESET}"; }

show_menu() {
  echo -e "\n${CYAN}${BOLD}======================================================"
  echo "         TRANSPARENCY CHAIN — SYSTEM PANEL"
  echo -e "======================================================${RESET}"
  echo " 1) Start Servers (Backend & Frontend)"
  echo " 2) Stop Servers"
  echo " 3) Run E2E Verification Suite (89 Test Cases)"
  echo " 4) Run Accept & Lock Milestone Integration Test"
  echo " 5) View Logs (Backend)"
  echo " 6) View Logs (Frontend)"
  echo " 7) Exit"
  echo -e "${CYAN}======================================================${RESET}"
  echo -n "Select an option [1-7]: "
}

while true; do
  show_menu
  read -r choice
  case "$choice" in
    1)
      info "Starting Transparency Chain servers..."
      bash start.sh || error "Failed to start servers."
      ;;
    2)
      info "Stopping Transparency Chain servers..."
      bash stop.sh || error "Failed to stop servers."
      ;;
    3)
      info "Running End-to-End Verification Suite..."
      bash verify.sh || error "E2E verification had failures."
      ;;
    4)
      info "Running Accept & Lock Milestone test..."
      bash test_accept_lock.sh || error "Accept & Lock test failed."
      ;;
    5)
      info "Showing backend logs (Ctrl+C to stop)..."
      tail -n 100 -f backend.log || true
      ;;
    6)
      info "Showing frontend logs (Ctrl+C to stop)..."
      tail -n 100 -f frontend.log || true
      ;;
    7)
      ok "Goodbye!"
      exit 0
      ;;
    *)
      error "Invalid option. Please choose a number between 1 and 7."
      ;;
  esac
done
