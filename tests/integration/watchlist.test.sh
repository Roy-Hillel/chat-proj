#!/bin/bash
#
# Integration test for watchlist feature via chat API
# Requires server running on localhost:3001
#
# Tests:
#   1. Add movies to watchlist
#   2. Get watchlist
#   3. Mark movie as watched
#   4. Filter by watched status
#   5. Rate a movie
#   6. Remove from watchlist
#
# Usage: ./watchlist.test.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

echo "=== Watchlist Integration Test ==="
echo

# Helper function to send chat message and capture response
send_chat() {
  local message="$1"
  local response
  response=$(curl -s -N -X POST http://localhost:3001/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"$USER_ID\",\"conversationId\":\"$CONV_ID\",\"message\":\"$message\"}" \
    --max-time 30)
  echo "$response"
}

# Helper to check if response contains expected text
check_response() {
  local response="$1"
  local expected="$2"
  local test_name="$3"

  if echo "$response" | grep -qi "$expected"; then
    echo -e "${GREEN}✓${NC} $test_name"
    return 0
  else
    echo -e "${RED}✗${NC} $test_name"
    echo "  Expected to find: '$expected'"
    echo "  Response: ${response:0:200}..."
    FAILED=1
    return 1
  fi
}

# 1. Create a test user
echo "Setting up test user..."
USER_RES=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"watchlist_tester@example.com"}')
USER_ID=$(echo "$USER_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo -e "${RED}Error: Could not create test user${NC}"
  exit 1
fi
echo "User ID: $USER_ID"

# 2. Create a conversation for watchlist tests
echo -e "\nCreating conversation..."
CONV_RES=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"title\":\"Watchlist Test\"}")
CONV_ID=$(echo "$CONV_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo -e "${RED}Error: Could not create conversation${NC}"
  exit 1
fi
echo "Conversation ID: $CONV_ID"
echo

# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Add movies to watchlist
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 1: Add movies to watchlist"
echo "----------------------------------------"

RESPONSE=$(send_chat "Add The Godfather and Pulp Fiction to my watchlist")
check_response "$RESPONSE" "watchlist" "Add movies to watchlist"
echo

# Small delay between requests
sleep 1

# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Get watchlist
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 2: Get watchlist"
echo "----------------------------------------"

RESPONSE=$(send_chat "Show my watchlist")
check_response "$RESPONSE" "Watchlist" "Get watchlist returns results"
echo

sleep 1

# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Mark movie as watched
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 3: Mark movie as watched"
echo "----------------------------------------"

RESPONSE=$(send_chat "I watched The Godfather")
check_response "$RESPONSE" "watched" "Mark movie as watched"
echo

sleep 1

# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Filter by unwatched
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 4: Filter by unwatched movies"
echo "----------------------------------------"

RESPONSE=$(send_chat "Show me movies I haven't watched yet")
check_response "$RESPONSE" "unwatched\|Not watched\|Pulp Fiction" "Filter unwatched movies"
echo

sleep 1

# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Rate a movie
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 5: Rate a movie in watchlist"
echo "----------------------------------------"

RESPONSE=$(send_chat "Rate Pulp Fiction 9 out of 10")
check_response "$RESPONSE" "9\|rated\|Pulp Fiction" "Rate movie in watchlist"
echo

sleep 1

# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Remove from watchlist
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Test 6: Remove from watchlist"
echo "----------------------------------------"

RESPONSE=$(send_chat "Remove The Godfather from my watchlist")
check_response "$RESPONSE" "Removed\|watchlist" "Remove movie from watchlist"
echo

# ─────────────────────────────────────────────────────────────────────────────
# Cleanup: Delete test conversation
# ─────────────────────────────────────────────────────────────────────────────
echo "----------------------------------------"
echo "Cleanup"
echo "----------------------------------------"

curl -s -X DELETE "http://localhost:3001/api/conversations/$CONV_ID" > /dev/null
echo "Deleted test conversation"
echo

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}Watchlist Integration Test: PASSED${NC}"
else
  echo -e "${RED}Watchlist Integration Test: FAILED${NC}"
fi
echo "========================================"

exit $FAILED
