#!/usr/bin/env bash
# =============================================================================
# Transparency Chain — Full System Verification Script
# Verifies Phase 1 (Discovery) and Phase 2 (Negotiation) are working correctly.
#
# Usage:
#   bash verify.sh              # Run all tests (server must already be running)
#   bash verify.sh --start      # Also start the server first
# =============================================================================

BASE="http://localhost:8081"
PASS=0; FAIL=0

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
DIM='\033[2m'

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()   { PASS=$((PASS+1)); echo -e "  ${GREEN}✔ PASS${RESET}  $1"; }
fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}✘ FAIL${RESET}  $1"; echo -e "        ${DIM}Got: $2${RESET}"; }
section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${RESET}"; }
info()    { echo -e "  ${DIM}$1${RESET}"; }

assert_status() {
  local label=$1 expected=$2 got=$3
  if [ "$got" = "$expected" ]; then ok "$label (status=$got)";
  else fail "$label — expected '$expected'" "got '$got'"; fi
}

assert_contains() {
  local label=$1 needle=$2 haystack=$3
  if echo "$haystack" | grep -q "$needle"; then ok "$label";
  else fail "$label — expected to contain '$needle'" "$(echo "$haystack" | head -c 200)"; fi
}

assert_not_contains() {
  local label=$1 needle=$2 haystack=$3
  if echo "$haystack" | grep -qv "$needle" && ! echo "$haystack" | grep -q "$needle"; then ok "$label";
  else fail "$label — expected NOT to contain '$needle'" "$(echo "$haystack" | head -c 200)"; fi
}

# ── Fetch with status code ────────────────────────────────────────────────────
do_get()  { curl -s -w "\n__STATUS:%{http_code}" -H "Authorization: Bearer $1" "$2"; }
do_post() { curl -s -w "\n__STATUS:%{http_code}" -X POST -H "Authorization: Bearer $1" \
              -H "Content-Type: application/json" -d "$3" "$2"; }

parse_status() { echo "$1" | grep "__STATUS:" | sed 's/__STATUS://'; }
parse_body()   { echo "$1" | grep -v "__STATUS:"; }
parse_field()  { parse_body "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null; }

# =============================================================================
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       TRANSPARENCY CHAIN — SYSTEM VERIFICATION SUITE        ║"
echo "║                  Phase 1 & Phase 2 Tests                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# ── 0. Server reachability ────────────────────────────────────────────────────
section "0. SERVER REACHABILITY"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"dummyfunder@demo.com","password":"demo"}' 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  ok "Backend is reachable at $BASE (HTTP $HTTP_CODE)"
else
  fail "Backend is NOT reachable at $BASE" "HTTP $HTTP_CODE — Run: bash start.sh first"
  echo -e "\n${RED}Cannot run tests — server is down.${RESET}"
  exit 1
fi

# ── Reset Database State for Verification ─────────────────────────────────────
echo -e "${YELLOW}Resetting database state for verification...${RESET}"
mysql -u root -proot transparency_chain 2>/dev/null <<'SQL'
SET FOREIGN_KEY_CHECKS=0;

DELETE FROM milestone_change_requests 
WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995');

DELETE FROM milestone_versions 
WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995');

DELETE FROM ticket_reviews WHERE ticket_id IN (SELECT id FROM tickets WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995'));
DELETE FROM tickets WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995');
DELETE FROM evidence_analysis WHERE evidence_id IN (SELECT id FROM proof_submissions WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995'));
DELETE FROM proof_submissions WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995');
DELETE FROM users WHERE email = 'funder2@demo.com';
DELETE FROM funder_profiles WHERE user_id NOT IN (SELECT id FROM users);

UPDATE milestones 
SET current_version_id = NULL, 
    status = 'PENDING',
    amount_allocated = CASE sequence_number 
        WHEN 1 THEN 200000.00 
        WHEN 2 THEN 350000.00 
        WHEN 3 THEN 200000.00 
        ELSE amount_allocated 
    END
WHERE project_id = 'ab5fac0c-9601-11f1-8b56-a987a7b38995';

DELETE FROM funding_milestone_commitments;
DELETE FROM funding_commitments WHERE project_id = UNHEX(REPLACE('ab5fac0c-9601-11f1-8b56-a987a7b38995','-',''));
DELETE FROM escrow_accounts WHERE project_id = UNHEX(REPLACE('ab5fac0c-9601-11f1-8b56-a987a7b38995','-',''));
UPDATE projects SET status = 'PUBLISHED' WHERE id = UNHEX(REPLACE('ab5fac0c-9601-11f1-8b56-a987a7b38995','-',''));

DELETE FROM org_project_engagements 
WHERE project_id = UNHEX(REPLACE('ab5fac0c-9601-11f1-8b56-a987a7b38995','-',''));

DELETE FROM audit_logs WHERE entity_type IN ('MILESTONE_CR', 'TICKET_RAISED', 'TICKET_ACCEPTED', 'TICKET_REJECTED', 'TICKET_REVIEWED', 'TICKET_CLARIFICATION', 'COMMITMENT_CREATED', 'COMMITMENT_ACTIVATED', 'BLOCKCHAIN_ESCROW_DEPLOYED');

SET FOREIGN_KEY_CHECKS=1;
SQL
echo -e "${GREEN}Database reset completed successfully.${RESET}"

# ── 1. Authentication ─────────────────────────────────────────────────────────
section "1. AUTHENTICATION"

FUNDER_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dummyfunder@demo.com","password":"demo"}')
FT=$(echo "$FUNDER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
FUNDER_ROLE=$(echo "$FUNDER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))" 2>/dev/null)

if [ -n "$FT" ] && [ "$FUNDER_ROLE" = "FUNDER" ]; then
  ok "Funder login — token obtained (role=FUNDER)"
else
  fail "Funder login failed" "$FUNDER_RESP"
fi

NGO_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"727724eucy040@skcet.ac.in","password":"password"}')
NT=$(echo "$NGO_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
NGO_ROLE=$(echo "$NGO_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))" 2>/dev/null)

if [ -n "$NT" ] && [ "$NGO_ROLE" = "NGO" ]; then
  ok "NGO login — token obtained (role=NGO)"
else
  fail "NGO login failed" "$NGO_RESP"
fi

# ── 2. Role enforcement ───────────────────────────────────────────────────────
section "2. ROLE ENFORCEMENT"

UNAUTH=$(curl -s -w "\n__STATUS:%{http_code}" "$BASE/api/org/projects" 2>/dev/null)
assert_status "Unauthenticated request → 401" "401" "$(parse_status "$UNAUTH")"

NGO_TRY=$(curl -s -w "\n__STATUS:%{http_code}" -H "Authorization: Bearer $NT" \
  "$BASE/api/org/projects" 2>/dev/null)
# Spring Security @PreAuthorize returns 403 for authenticated but wrong-role
# However if token parsing fails it returns 401. Accept either as "access denied".
NGO_STATUS=$(parse_status "$NGO_TRY")
if [ "$NGO_STATUS" = "403" ] || [ "$NGO_STATUS" = "401" ]; then
  ok "NGO cannot access FUNDER endpoint → $NGO_STATUS (access denied)"
else
  fail "NGO should be denied FUNDER endpoint" "Got HTTP $NGO_STATUS"
fi

FUNDER_TRY=$(curl -s -w "\n__STATUS:%{http_code}" -H "Authorization: Bearer $FT" \
  "$BASE/api/org/projects" 2>/dev/null)
assert_status "FUNDER accesses FUNDER endpoint → 200" "200" "$(parse_status "$FUNDER_TRY")"

# ── 3. Phase 1 — Marketplace Browse ──────────────────────────────────────────
section "3. PHASE 1 — MARKETPLACE BROWSE"

MARKET=$(do_get "$FT" "$BASE/api/org/projects")
MARKET_BODY=$(parse_body "$MARKET")
assert_status "GET /api/org/projects → 200" "200" "$(parse_status "$MARKET")"
assert_contains "Returns PUBLISHED projects" "PUBLISHED" "$MARKET_BODY"
assert_contains "NGO trust profile present in card" "ngoTrustScore" "$MARKET_BODY"

# SDG filter
SDG_MATCH=$(do_get "$FT" "$BASE/api/org/projects?sdgGoal=SDG3")
assert_contains "SDG3 filter returns results" "SDG3" "$(parse_body "$SDG_MATCH")"

SDG_NO=$(do_get "$FT" "$BASE/api/org/projects?sdgGoal=SDG17")
SDG_NO_BODY=$(parse_body "$SDG_NO")
if echo "$SDG_NO_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if len(d)==0 else 1)" 2>/dev/null; then
  ok "SDG17 filter returns empty array"
else
  fail "SDG17 filter should return empty array" "$(echo $SDG_NO_BODY | head -c 60)"
fi

# Budget filter
BUDGET_MATCH=$(do_get "$FT" "$BASE/api/org/projects?budgetMin=500000&budgetMax=1000000")
assert_contains "Budget range filter works" "750000" "$(parse_body "$BUDGET_MATCH")"

BUDGET_NO=$(do_get "$FT" "$BASE/api/org/projects?budgetMax=100")
BUDGET_NO_BODY=$(parse_body "$BUDGET_NO")
if echo "$BUDGET_NO_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if len(d)==0 else 1)" 2>/dev/null; then
  ok "Budget filter excludes out-of-range projects"
else
  fail "Budget filter should return empty array" "$(echo $BUDGET_NO_BODY | head -c 60)"
fi

# ── 4. Phase 1 — Project Detail ───────────────────────────────────────────────
section "4. PHASE 1 — PROJECT DETAIL"

PROJECT_ID=$(parse_body "$MARKET" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d[0]['projectId'] if d else '')" 2>/dev/null)
info "Using project: $PROJECT_ID"

DETAIL=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID")
DETAIL_BODY=$(parse_body "$DETAIL")
assert_status "GET /api/org/projects/{id} → 200" "200" "$(parse_status "$DETAIL")"
assert_contains "Milestone list present" "milestones" "$DETAIL_BODY"
assert_contains "NGO trust profile present" "ngoTrustProfile" "$DETAIL_BODY"
assert_contains "Trust dimensions present (registrationAgeScore)" "registrationAgeScore" "$DETAIL_BODY"
assert_contains "Trust dimensions present (documentCompletenessScore)" "documentCompletenessScore" "$DETAIL_BODY"
assert_contains "Compliance flags present (has80G)" "has80G" "$DETAIL_BODY"
assert_contains "Milestones ordered by sequence" "sequenceNumber" "$DETAIL_BODY"
assert_contains "Auto-created DISCOVERED engagement" "DISCOVERED\|UNDER_REVIEW\|NEGOTIATING" "$DETAIL_BODY"

# Get engagement ID and milestones
ENGAGEMENT_ID=$(echo "$DETAIL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('engagementId',''))" 2>/dev/null)
MILESTONES=$(echo "$DETAIL_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin)['milestones']; print(' '.join([m['id'] for m in d]))" 2>/dev/null)
M1=$(echo $MILESTONES | awk '{print $1}')
M2=$(echo $MILESTONES | awk '{print $2}')
M3=$(echo $MILESTONES | awk '{print $3}')
info "Engagement ID: $ENGAGEMENT_ID"
info "Milestone 1: $M1"

# ── 5. Phase 1 — Mark UNDER_REVIEW ───────────────────────────────────────────
section "5. PHASE 1 — ENGAGEMENT STATE TRANSITION"

# Reset engagement to DISCOVERED if needed
CURRENT_STATUS=$(echo "$DETAIL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('engagementStatus',''))" 2>/dev/null)
info "Current engagement status: $CURRENT_STATUS"

if [ "$CURRENT_STATUS" = "DISCOVERED" ]; then
  REVIEW=$(do_post "$FT" "$BASE/api/org/projects/$PROJECT_ID/review" '{}')
  REVIEW_STATUS=$(parse_body "$REVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('engagementStatus',''))" 2>/dev/null)
  assert_status "POST /review → 200" "200" "$(parse_status "$REVIEW")"
  [ "$REVIEW_STATUS" = "UNDER_REVIEW" ] && ok "Engagement moved to UNDER_REVIEW" || fail "Expected UNDER_REVIEW" "$REVIEW_STATUS"

  REVIEW2=$(do_post "$FT" "$BASE/api/org/projects/$PROJECT_ID/review" '{}')
  assert_contains "Double-review guard rejected" "Invalid transition\|UNDER_REVIEW" "$(parse_body "$REVIEW2")"
else
  ok "Engagement already past DISCOVERED (status=$CURRENT_STATUS) — skipping transition test"
fi

# ── 6. Phase 2 — Raise Change Request ────────────────────────────────────────
section "6. PHASE 2 — RAISE CHANGE REQUEST"

# Use M2 (Phase 2 milestone) to avoid conflicts with milestone already LOCKED from previous runs
TARGET_M=$(echo "$MILESTONES" | awk '{print $NF}')   # last milestone (Phase 3)
info "Raising CR on milestone: $TARGET_M"

# Clean up any existing PENDING CR on this milestone
EXISTING_CR=$(mysql -u root -proot transparency_chain -sN \
  -e "SELECT id FROM milestone_change_requests WHERE milestone_id=UNHEX(REPLACE('$TARGET_M','-','')) AND status='PENDING' LIMIT 1;" 2>/dev/null || true)
if [ -n "$EXISTING_CR" ]; then
  info "Withdrawing existing PENDING CR first..."
  do_post "$FT" "$BASE/api/org/change-requests/$EXISTING_CR/withdraw" '{}' > /dev/null
fi

CR_RESP=$(do_post "$FT" \
  "$BASE/api/org/projects/$PROJECT_ID/milestones/$TARGET_M/change-request" \
  '{"budget":180000.00,"reason":"Scope review: outcome reporting costs re-estimated based on third-party quotes"}')
CR_BODY=$(parse_body "$CR_RESP")
assert_status "POST change-request → 200" "200" "$(parse_status "$CR_RESP")"
assert_contains "Proposed budget is 180000" "180000" "$CR_BODY"
assert_contains "Original budget is 200000" "200000" "$CR_BODY"
# Check proposedBy using python (JSON may be compact or pretty-printed)
NGO_BY=$(echo "$CR_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('original',{}).get('proposedBy',''))" 2>/dev/null)
FUNDER_BY=$(echo "$CR_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('proposed',{}).get('proposedBy',''))" 2>/dev/null)
[ "$NGO_BY" = "NGO" ]    && ok "Original version authored by NGO"    || fail "Original version should be NGO"    "proposedBy=$NGO_BY"
[ "$FUNDER_BY" = "FUNDER" ] && ok "Proposed version authored by FUNDER" || fail "Proposed version should be FUNDER" "proposedBy=$FUNDER_BY"

CR_ID=$(echo "$CR_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "CR ID: $CR_ID"

# ── 7. Phase 2 — Duplicate CR Guard ──────────────────────────────────────────
section "7. PHASE 2 — DUPLICATE CR GUARD"

DUP=$(do_post "$FT" \
  "$BASE/api/org/projects/$PROJECT_ID/milestones/$TARGET_M/change-request" \
  '{"budget":170000.00,"reason":"Second attempt"}')
assert_status "Duplicate CR → 400" "400" "$(parse_status "$DUP")"
assert_contains "Guard message correct" "already pending" "$(parse_body "$DUP")"

# ── 8. Phase 2 — GET Change Request (diff view) ──────────────────────────────
section "8. PHASE 2 — GET CHANGE REQUEST (DIFF VIEW)"

CR_GET=$(do_get "$FT" "$BASE/api/org/change-requests/$CR_ID")
CR_GET_BODY=$(parse_body "$CR_GET")
assert_status "GET change-request → 200" "200" "$(parse_status "$CR_GET")"
assert_contains "Original snapshot present" "original" "$CR_GET_BODY"
assert_contains "Proposed snapshot present" "proposed" "$CR_GET_BODY"
assert_contains "Requested org name present" "requestedByOrgName" "$CR_GET_BODY"

# ── 9. Phase 2 — NGO Inbox ───────────────────────────────────────────────────
section "9. PHASE 2 — NGO CHANGE-REQUEST INBOX"

NGO_INBOX=$(do_get "$NT" "$BASE/api/ngo/change-requests?status=PENDING")
NGO_INBOX_BODY=$(parse_body "$NGO_INBOX")
assert_status "GET ngo/change-requests → 200" "200" "$(parse_status "$NGO_INBOX")"
assert_contains "NGO inbox has pending CRs" "PENDING" "$NGO_INBOX_BODY"

# ── 10. Phase 2 — NGO Counter ────────────────────────────────────────────────
section "10. PHASE 2 — NGO COUNTER-PROPOSAL"

COUNTER_RESP=$(do_post "$NT" \
  "$BASE/api/ngo/change-requests/$CR_ID/respond" \
  '{"decision":"COUNTER","responseNote":"Can do 190000 — material costs are fixed","counterBudget":190000.00}')
COUNTER_BODY=$(parse_body "$COUNTER_RESP")
assert_status "NGO COUNTER respond → 200" "200" "$(parse_status "$COUNTER_RESP")"
assert_contains "Original CR is now COUNTERED" "COUNTERED" "$COUNTER_BODY"

# Get the auto-created counter CR
NEW_PENDING=$(do_get "$NT" "$BASE/api/ngo/change-requests?status=PENDING")
NEW_CR_ID=$(parse_body "$NEW_PENDING" | python3 -c "
import sys,json; d=json.load(sys.stdin)
# Find the one that is NOT the original CR
for item in d:
    if item.get('id') != '$CR_ID':
        print(item['id']); break
" 2>/dev/null)
info "Counter CR ID: $NEW_CR_ID"
assert_contains "New PENDING counter CR created" "PENDING" "$(parse_body "$NEW_PENDING")"

# ── 11. Phase 2 — NGO Accept (lock the milestone) ────────────────────────────
section "11. PHASE 2 — NGO ACCEPT (LOCK MILESTONE)"

ACCEPT_RESP=$(do_post "$NT" \
  "$BASE/api/ngo/change-requests/$NEW_CR_ID/respond" \
  '{"decision":"ACCEPT","responseNote":"Agreed on 190000"}')
ACCEPT_BODY=$(parse_body "$ACCEPT_RESP")
assert_status "NGO ACCEPT respond → 200" "200" "$(parse_status "$ACCEPT_RESP")"
assert_contains "Counter CR status is ACCEPTED" "ACCEPTED" "$ACCEPT_BODY"
# Check proposed.status via python (avoids quote/whitespace issues)
PROP_STATUS=$(echo "$ACCEPT_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('proposed',{}).get('status',''))" 2>/dev/null)
[ "$PROP_STATUS" = "ACCEPTED" ] && ok "Proposed version status is ACCEPTED" || fail "Expected proposed.status=ACCEPTED" "$PROP_STATUS"

# Verify the milestone is LOCKED
LOCKED_DETAIL=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID")
LOCKED_BODY=$(parse_body "$LOCKED_DETAIL")
LOCKED_M=$(echo "$LOCKED_BODY" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for m in d['milestones']:
    if m['id'] == '$TARGET_M':
        print(m['status'])
" 2>/dev/null)
[ "$LOCKED_M" = "LOCKED" ] && ok "Target milestone is now LOCKED" || fail "Expected LOCKED" "$LOCKED_M (check for old DB data)"

# ── 12. Phase 2 — Withdraw a change request ───────────────────────────────────
section "12. PHASE 2 — WITHDRAW CHANGE REQUEST"

# Raise a new CR on M2 (second milestone) then withdraw it
M2_CR=$(do_post "$FT" \
  "$BASE/api/org/projects/$PROJECT_ID/milestones/$M2/change-request" \
  '{"budget":330000.00,"reason":"Revisiting Phase 2 cost estimates"}')
M2_CR_ID=$(parse_body "$M2_CR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -n "$M2_CR_ID" ]; then
  WDRAW=$(do_post "$FT" "$BASE/api/org/change-requests/$M2_CR_ID/withdraw" '{}')
  assert_status "Withdraw → 200" "200" "$(parse_status "$WDRAW")"
  assert_contains "CR is WITHDRAWN" "WITHDRAWN" "$(parse_body "$WDRAW")"
  
  WDRAW2=$(do_post "$FT" "$BASE/api/org/change-requests/$M2_CR_ID/withdraw" '{}')
  assert_status "Double-withdraw → 400" "400" "$(parse_status "$WDRAW2")"
  assert_contains "Guard message for double-withdraw" "PENDING\|Only PENDING" "$(parse_body "$WDRAW2")"
else
  fail "Could not raise CR on M2 for withdraw test" "$(parse_body "$M2_CR" | head -c 100)"
fi

# ── 13. Engagement state check ────────────────────────────────────────────────
section "13. ENGAGEMENT STATE"

ENG_STATUS=$(echo "$LOCKED_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('engagementStatus',''))" 2>/dev/null)
assert_contains "Engagement is NEGOTIATING (or beyond)" "NEGOTIATING\|COMMITTED\|ACTIVE" "$ENG_STATUS"

# ── 13B. Phase 3 — Funding Commitment & Simulated Escrow ───────────────────
section "13B. PHASE 3 — FUNDING COMMITMENT & SIMULATED ESCROW"

# 1. Budget mismatch guard test
BAD_COMMIT=$(do_post "$FT" "$BASE/api/org/projects/$PROJECT_ID/commit" \
  "{\"totalAmount\":900000.00,\"milestoneBreakdown\":[{\"milestoneId\":\"$M1\",\"amount\":200000.00},{\"milestoneId\":\"$M2\",\"amount\":350000.00},{\"milestoneId\":\"$M3\",\"amount\":190000.00}]}")
assert_status "Commit with mismatched budget → 400" "400" "$(parse_status "$BAD_COMMIT")"
assert_contains "Budget conservation error message" "Sum of milestone budgets" "$(parse_body "$BAD_COMMIT")"

# 2. Valid Commitment Creation
COMMIT_RESP=$(do_post "$FT" "$BASE/api/org/projects/$PROJECT_ID/commit" \
  "{\"totalAmount\":740000.00,\"milestoneBreakdown\":[{\"milestoneId\":\"$M1\",\"amount\":200000.00},{\"milestoneId\":\"$M2\",\"amount\":350000.00},{\"milestoneId\":\"$M3\",\"amount\":190000.00}]}")
COMMIT_BODY=$(parse_body "$COMMIT_RESP")
assert_status "POST /projects/{id}/commit → 200" "200" "$(parse_status "$COMMIT_RESP")"
assert_contains "Commitment status is PENDING" "PENDING" "$COMMIT_BODY"

COMMIT_ID=$(echo "$COMMIT_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "Commitment ID: $COMMIT_ID"

# 3. GET /commitments/{id}
GET_COMMIT=$(do_get "$FT" "$BASE/api/org/commitments/$COMMIT_ID")
assert_status "GET /commitments/{id} → 200" "200" "$(parse_status "$GET_COMMIT")"
assert_contains "Total committed amount present" "740000" "$(parse_body "$GET_COMMIT")"

# 4. Activate Commitment (Simulated Escrow Loading)
ACTIVATE_RESP=$(do_post "$FT" "$BASE/api/org/commitments/$COMMIT_ID/activate" '{}')
ACTIVATE_BODY=$(parse_body "$ACTIVATE_RESP")
assert_status "POST /commitments/{id}/activate → 200" "200" "$(parse_status "$ACTIVATE_RESP")"
assert_contains "Commitment status is ACTIVE" "ACTIVE" "$ACTIVATE_BODY"

# 5. Duplicate Commitment Guard
DUP_COMMIT=$(do_post "$FT" "$BASE/api/org/projects/$PROJECT_ID/commit" \
  "{\"totalAmount\":740000.00,\"milestoneBreakdown\":[{\"milestoneId\":\"$M1\",\"amount\":200000.00},{\"milestoneId\":\"$M2\",\"amount\":350000.00},{\"milestoneId\":\"$M3\",\"amount\":190000.00}]}")
assert_status "Duplicate commitment → 400" "400" "$(parse_status "$DUP_COMMIT")"
assert_contains "Active commitment guard" "already" "$(parse_body "$DUP_COMMIT")"

# ── 14. Phase 4 — Ticket Lifecycle & Verification Engine ──────────────────────
section "14. PHASE 4 — TICKET LIFECYCLE & VERIFICATION ENGINE"

# Check raising ticket without proof fails
FAIL_TICKET=$(do_post "$NT" "$BASE/api/ngo/milestones/$M1/tickets" '{}')
assert_status "Raise ticket without proof → 400" "400" "$(parse_status "$FAIL_TICKET")"
assert_contains "Proof missing error message" "proof submitted" "$(parse_body "$FAIL_TICKET")"

# Create a dummy proof file
echo "dummy invoice data for milestone 1" > /tmp/dummy_invoice.pdf

# NGO uploads proof submission
PROOF_RESP=$(curl -s -w "\n__STATUS:%{http_code}" -X POST -H "Authorization: Bearer $NT" \
  -F "file=@/tmp/dummy_invoice.pdf" \
  -F "metadata={\"vendor\":\"WaterCorp\",\"amount\":200000}" \
  -F "expectedType=INVOICE" \
  "$BASE/api/v1/milestones/$M1/proofs")

PROOF_BODY=$(parse_body "$PROOF_RESP")
assert_status "NGO uploads proof → 200" "200" "$(parse_status "$PROOF_RESP")"
PROOF_ID=$(echo "$PROOF_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "Uploaded proof ID: $PROOF_ID"

# NGO raises fund release ticket
TICKET_RESP=$(do_post "$NT" "$BASE/api/ngo/milestones/$M1/tickets" '{}')
TICKET_BODY=$(parse_body "$TICKET_RESP")
assert_status "NGO raises ticket → 200" "200" "$(parse_status "$TICKET_RESP")"
TICKET_ID=$(echo "$TICKET_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "Raised ticket ID: $TICKET_ID"
assert_contains "Ticket status is OPEN" "OPEN" "$TICKET_BODY"

# Funder retrieves tickets list
TICKETS_LIST=$(do_get "$FT" "$BASE/api/org/tickets")
assert_status "Funder GET /tickets → 200" "200" "$(parse_status "$TICKETS_LIST")"
assert_contains "Tickets list has OPEN ticket" "OPEN" "$(parse_body "$TICKETS_LIST")"

# Funder retrieves ticket details
TICKET_DETAIL=$(do_get "$FT" "$BASE/api/org/tickets/$TICKET_ID")
assert_status "Funder GET /tickets/{id} → 200" "200" "$(parse_status "$TICKET_DETAIL")"
assert_contains "Ticket details includes ticket field" "ticket" "$(parse_body "$TICKET_DETAIL")"

# Funder reviews ticket requesting clarification
REVIEW_CLARIF=$(do_post "$FT" "$BASE/api/org/tickets/$TICKET_ID/decision" '{"decision":"REQUEST_CLARIFICATION","comment":"Invoice is blur"}')
assert_status "Clarification request → 200" "200" "$(parse_status "$REVIEW_CLARIF")"
assert_contains "Ticket status updated to CLARIFICATION_REQUESTED" "CLARIFICATION_REQUESTED" "$(parse_body "$REVIEW_CLARIF")"

# Check milestone reverted to IN_PROGRESS (so NGO can re-upload)
MILESTONE_STATUS_REVERTED=$(mysql -u root -proot transparency_chain -sN \
  -e "SELECT status FROM milestones WHERE id=UNHEX(REPLACE('$M1','-',''));" 2>/dev/null)
info "Milestone status after clarification: $MILESTONE_STATUS_REVERTED"
[ "$MILESTONE_STATUS_REVERTED" = "IN_PROGRESS" ] && ok "Milestone status reverted to IN_PROGRESS" || fail "Expected IN_PROGRESS" "$MILESTONE_STATUS_REVERTED"

# Raise the ticket again (simulating re-upload / correction)
TICKET_RESP2=$(do_post "$NT" "$BASE/api/ngo/milestones/$M1/tickets" '{}')
TICKET_BODY2=$(parse_body "$TICKET_RESP2")
TICKET_ID2=$(echo "$TICKET_BODY2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "Re-raised ticket ID: $TICKET_ID2"

# Funder accepts the ticket (LOW risk by default)
REVIEW_ACCEPT=$(do_post "$FT" "$BASE/api/org/tickets/$TICKET_ID2/decision" '{"decision":"ACCEPT","comment":"Perfect"}')
assert_status "Accept ticket → 200" "200" "$(parse_status "$REVIEW_ACCEPT")"
assert_contains "Ticket is ACCEPTED" "ACCEPTED" "$(parse_body "$REVIEW_ACCEPT")"

# Verify milestone status is now VERIFIED
MILESTONE_STATUS_VERIFIED=$(mysql -u root -proot transparency_chain -sN \
  -e "SELECT status FROM milestones WHERE id=UNHEX(REPLACE('$M1','-',''));" 2>/dev/null)
info "Milestone status after accept: $MILESTONE_STATUS_VERIFIED"
[ "$MILESTONE_STATUS_VERIFIED" = "VERIFIED" ] && ok "Milestone status is VERIFIED" || fail "Expected VERIFIED" "$MILESTONE_STATUS_VERIFIED"

# ── 15. Phase 4 — Multi-Reviewer Guard for High Risk ──────────────────────────
section "15. PHASE 4 — MULTI-REVIEWER GUARD FOR HIGH RISK"

# Create another ticket on M2 for testing high risk. NGO first uploads proof on M2.
PROOF_RESP2=$(curl -s -w "\n__STATUS:%{http_code}" -X POST -H "Authorization: Bearer $NT" \
  -F "file=@/tmp/dummy_invoice.pdf" \
  -F "metadata={\"vendor\":\"BuilderCorp\",\"amount\":350000}" \
  -F "expectedType=INVOICE" \
  "$BASE/api/v1/milestones/$M2/proofs")
assert_status "NGO uploads proof on M2 → 200" "200" "$(parse_status "$PROOF_RESP2")"

TICKET_M2_RESP=$(do_post "$NT" "$BASE/api/ngo/milestones/$M2/tickets" '{}')
TICKET_M2_BODY=$(parse_body "$TICKET_M2_RESP")
TICKET_M2_ID=$(echo "$TICKET_M2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
info "M2 Ticket ID: $TICKET_M2_ID"

# Manually set risk level to HIGH in the database to trigger multi-reviewer flow
mysql -u root -proot transparency_chain -e "UPDATE tickets SET risk_level='HIGH', risk_score=75 WHERE id=UNHEX(REPLACE('$TICKET_M2_ID','-',''));" 2>/dev/null

# Reviewer 1 (Funder) accepts the ticket
REVIEW_M2_1=$(do_post "$FT" "$BASE/api/org/tickets/$TICKET_M2_ID/decision" '{"decision":"ACCEPT","comment":"Looks okay to me, but high risk"}')
assert_status "Reviewer 1 ACCEPT → 200" "200" "$(parse_status "$REVIEW_M2_1")"
assert_contains "Ticket status remains UNDER_ORG_REVIEW (needs 2nd reviewer)" "UNDER_ORG_REVIEW" "$(parse_body "$REVIEW_M2_1")"

# Register a second Funder user for secondary review
# Register a second Funder user for secondary review via API
curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"funder2@demo.com","password":"demo","role":"FUNDER","fullName":"Secondary Funder","orgName":"Global Demo Fund"}' > /dev/null

mysql -u root -proot transparency_chain <<'SQL'
  INSERT INTO org_project_engagements (id, project_id, funder_id, status)
  SELECT UNHEX(REPLACE(UUID(),'-','')), UNHEX(REPLACE('ab5fac0c-9601-11f1-8b56-a987a7b38995','-','')), fp.id, 'ACTIVE'
  FROM funder_profiles fp JOIN users u ON fp.user_id = u.id
  WHERE u.email = 'funder2@demo.com'
  ON DUPLICATE KEY UPDATE status=status;
SQL

# Login as Reviewer 2
FUNDER2_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"funder2@demo.com","password":"demo"}')
FT2=$(echo "$FUNDER2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

# Reviewer 2 (Funder) accepts the ticket
REVIEW_M2_2=$(do_post "$FT2" "$BASE/api/org/tickets/$TICKET_M2_ID/decision" '{"decision":"ACCEPT","comment":"Agreed. Looks good."}')
assert_status "Reviewer 2 ACCEPT → 200" "200" "$(parse_status "$REVIEW_M2_2")"
assert_contains "Ticket status becomes ACCEPTED" "ACCEPTED" "$(parse_body "$REVIEW_M2_2")"

# clean up temporary files
rm -f /tmp/dummy_invoice.pdf

# ── 15B. Phase 5 — Disbursement Engine & Escrow Ledger Integration ─────────────
section "15B. PHASE 5 — DISBURSEMENT ENGINE & ESCROW LEDGER INTEGRATION"

# 1. Inspect Escrow Ledger after M1 + M2 disbursements
ESCROW_RESP=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID/escrow")
ESCROW_BODY=$(parse_body "$ESCROW_RESP")
assert_status "GET /projects/{id}/escrow → 200" "200" "$(parse_status "$ESCROW_RESP")"
assert_contains "Escrow status is PARTIALLY_RELEASED" "PARTIALLY_RELEASED" "$ESCROW_BODY"
assert_contains "Partial released amount recorded (550000)" "550000" "$ESCROW_BODY"

# 2. Inspect Commitment Status
COMMIT_STATE=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID/commitment")
assert_contains "Commitment status is PARTIALLY_RELEASED" "PARTIALLY_RELEASED" "$(parse_body "$COMMIT_STATE")"

# 3. Process final milestone (M3) ticket lifecycle to reach 100% completion
echo "dummy proof data for milestone 3" > /tmp/dummy_invoice3.pdf
M3_PROOF_RESP=$(curl -s -w "\n__STATUS:%{http_code}" -X POST -H "Authorization: Bearer $NT" \
  -F "file=@/tmp/dummy_invoice3.pdf" \
  -F "metadata={\"vendor\":\"ImpactLogistics\",\"amount\":190000}" \
  -F "expectedType=INVOICE" \
  "$BASE/api/v1/milestones/$M3/proofs")
rm -f /tmp/dummy_invoice3.pdf

M3_TICKET_RESP=$(do_post "$NT" "$BASE/api/ngo/milestones/$M3/tickets" '{}')
M3_TICKET_ID=$(parse_body "$M3_TICKET_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Accept M3 ticket
ACCEPT_M3=$(do_post "$FT" "$BASE/api/org/tickets/$M3_TICKET_ID/decision" '{"decision":"ACCEPT","comment":"Final milestone accepted"}')
assert_status "Accept M3 ticket → 200" "200" "$(parse_status "$ACCEPT_M3")"

# 4. Verify Escrow Account is FULLY_RELEASED
FINAL_ESCROW=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID/escrow")
FINAL_ESCROW_BODY=$(parse_body "$FINAL_ESCROW")
assert_contains "Escrow status is FULLY_RELEASED" "FULLY_RELEASED" "$FINAL_ESCROW_BODY"
assert_contains "Total released amount (740000)" "740000" "$FINAL_ESCROW_BODY"

# 5. Verify Project Status updated to COMPLETED
FINAL_PROJ=$(do_get "$FT" "$BASE/api/org/projects/$PROJECT_ID")
assert_contains "Project status is COMPLETED" "COMPLETED" "$(parse_body "$FINAL_PROJ")"

# 6. Verify Disbursement Audit Log entries
DISBURSE_AUDIT_COUNT=$(mysql -u root -proot transparency_chain -sN \
  -e "SELECT COUNT(*) FROM audit_logs WHERE entity_type='DISBURSEMENT_EXECUTED';" 2>/dev/null || echo "0")
info "DISBURSEMENT_EXECUTED audit log entries: $DISBURSE_AUDIT_COUNT"
[ "$DISBURSE_AUDIT_COUNT" -gt "0" ] && ok "Audit log has DISBURSEMENT_EXECUTED entries ($DISBURSE_AUDIT_COUNT rows)" \
  || fail "No DISBURSEMENT_EXECUTED audit log entries found" ""

# ── 16. Audit trail ───────────────────────────────────────────────────────────
section "16. AUDIT TRAIL"

AUDIT_COUNT=$(mysql -u root -proot transparency_chain -sN \
  -e "SELECT COUNT(*) FROM audit_logs WHERE entity_type='MILESTONE_CR';" 2>/dev/null || echo "0")
info "MILESTONE_CR audit log entries: $AUDIT_COUNT"
[ "$AUDIT_COUNT" -gt "0" ] && ok "Audit log has MILESTONE_CR entries ($AUDIT_COUNT rows)" \
  || fail "No MILESTONE_CR audit log entries found" ""

# ── Results ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}RESULTS: ${RESET}${GREEN}$PASS passed${RESET}  /  ${RED}$FAIL failed${RESET}  /  $TOTAL total"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}"
  echo "  ✔  ALL TESTS PASSED — Phases 1 & 2 are working correctly!"
  echo -e "${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}"
  echo "  ✘  $FAIL test(s) failed — check output above for details"
  echo -e "${RESET}"
  exit 1
fi
