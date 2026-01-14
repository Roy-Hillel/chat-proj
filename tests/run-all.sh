#!/bin/bash
#
# Run all tests for the chat-proj application
#
# Dynamically discovers and runs:
#   - Server unit tests: server/tests/*.test.ts
#   - Client unit tests: client/run-tests.sh (if exists)
#   - Integration tests: tests/integration/*.test.sh
#
# Usage:
#   ./tests/run-all.sh                    # Run all tests
#   ./tests/run-all.sh --unit-only        # Run only unit tests (no server required)
#   ./tests/run-all.sh --integration-only # Run only integration tests (server required)
#   ./tests/run-all.sh --list             # List all available tests
#
# Requirements:
#   - For unit tests: server/.env with TASTE_DIVE_API_KEY and OMDB_API_KEY
#   - For integration tests: server running on localhost:3001
#   - For client tests: client dependencies installed
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INTEGRATION_DIR="$SCRIPT_DIR/integration"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RUN_UNIT=true
RUN_INTEGRATION=true
RUN_CLIENT=true
LIST_ONLY=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --unit-only)
      RUN_INTEGRATION=false
      RUN_CLIENT=false
      ;;
    --integration-only)
      RUN_UNIT=false
      RUN_CLIENT=false
      ;;
    --no-client)
      RUN_CLIENT=false
      ;;
    --list)
      LIST_ONLY=true
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --unit-only        Run only server unit tests"
      echo "  --integration-only Run only integration tests (requires server)"
      echo "  --no-client        Skip client tests"
      echo "  --list             List all available tests"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      ;;
  esac
done

# Discover integration tests
discover_integration_tests() {
  find "$INTEGRATION_DIR" -name "*.test.sh" -type f 2>/dev/null | sort
}

# Get test name from path
get_test_name() {
  basename "$1" .test.sh
}

# List mode
if [ "$LIST_ONLY" = true ]; then
  echo "========================================"
  echo "       Available Tests"
  echo "========================================"
  echo
  
  echo -e "${BLUE}Server Unit Tests:${NC}"
  for test_file in $(find "$PROJECT_ROOT/server/tests" -name "*.test.ts" -type f 2>/dev/null | sort); do
    echo "  - $(basename "$test_file" .test.ts)"
  done
  echo
  
  echo -e "${BLUE}Integration Tests:${NC}"
  for test_file in $(discover_integration_tests); do
    echo "  - $(get_test_name "$test_file")"
  done
  echo
  
  echo -e "${BLUE}Client Tests:${NC}"
  if [ -f "$PROJECT_ROOT/client/run-tests.sh" ]; then
    echo "  - client (via run-tests.sh)"
  else
    echo "  - (none found)"
  fi
  echo
  exit 0
fi

FAILED=0
TOTAL_PASSED=0
TOTAL_FAILED=0

echo "========================================"
echo "       Running All Tests"
echo "========================================"
echo

# ─────────────────────────────────────────────────────────────────────────────
# 1. Server Unit Tests (dynamically discovered)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$RUN_UNIT" = true ]; then
  echo "========================================"
  echo -e "${BLUE}  Server Unit Tests${NC}"
  echo "========================================"
  echo
  
  if "$SCRIPT_DIR/run-server-tests.sh"; then
    echo -e "${GREEN}✓ Server unit tests passed${NC}"
    ((TOTAL_PASSED++))
  else
    echo -e "${RED}✗ Server unit tests failed${NC}"
    ((TOTAL_FAILED++))
    FAILED=1
  fi
  echo
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Client Unit Tests
# ─────────────────────────────────────────────────────────────────────────────
if [ "$RUN_CLIENT" = true ]; then
  echo "========================================"
  echo -e "${BLUE}  Client Unit Tests${NC}"
  echo "========================================"
  echo
  
  if [ -f "$PROJECT_ROOT/client/run-tests.sh" ]; then
    if (cd "$PROJECT_ROOT/client" && ./run-tests.sh); then
      echo -e "${GREEN}✓ Client unit tests passed${NC}"
      ((TOTAL_PASSED++))
    else
      echo -e "${RED}✗ Client unit tests failed${NC}"
      ((TOTAL_FAILED++))
      FAILED=1
    fi
  else
    echo -e "${YELLOW}↷ Skipping: client/run-tests.sh not found${NC}"
  fi
  echo
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Integration Tests (dynamically discovered)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$RUN_INTEGRATION" = true ]; then
  echo "========================================"
  echo -e "${BLUE}  Integration Tests${NC}"
  echo "========================================"
  echo "Note: Requires server running on localhost:3001"
  echo

  # Check if server is running
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}Server is running.${NC} Discovering integration tests..."
    echo
    
    INTEGRATION_TESTS=$(discover_integration_tests)
    
    if [ -z "$INTEGRATION_TESTS" ]; then
      echo -e "${YELLOW}No integration tests found in $INTEGRATION_DIR${NC}"
    else
      # Count tests
      TEST_COUNT=$(echo "$INTEGRATION_TESTS" | wc -l | tr -d ' ')
      echo "Found $TEST_COUNT integration test(s)"
      echo
      
      # Run each integration test
      for test_file in $INTEGRATION_TESTS; do
        test_name=$(get_test_name "$test_file")
        
        echo "----------------------------------------"
        echo "  Running: $test_name"
        echo "----------------------------------------"
        
        if bash "$test_file"; then
          echo -e "${GREEN}✓ $test_name passed${NC}"
          ((TOTAL_PASSED++))
        else
          echo -e "${RED}✗ $test_name failed${NC}"
          ((TOTAL_FAILED++))
          FAILED=1
        fi
        echo
      done
    fi
  else
    echo -e "${YELLOW}↷ Skipping integration tests: server not running on localhost:3001${NC}"
    echo "   Start the server with: cd server && npm run dev"
  fi
  echo
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "  ${GREEN}All tests passed!${NC} ✓"
else
  echo -e "  ${RED}Some tests failed${NC} ✗"
  echo "  Passed: $TOTAL_PASSED, Failed: $TOTAL_FAILED"
fi
echo "========================================"

exit $FAILED
