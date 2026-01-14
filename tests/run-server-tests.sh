#!/bin/bash
#
# Run server-side unit tests
#
# Dynamically discovers and runs all *.test.ts files in server/tests/
#
# Usage:
#   ./tests/run-server-tests.sh              # Run all server unit tests
#   ./tests/run-server-tests.sh --list       # List available tests without running
#   ./tests/run-server-tests.sh <test-name>  # Run specific test (e.g., "movie-tools")
#
# Requirements:
#   - server/.env with required API keys (TASTE_DIVE_API_KEY, OMDB_API_KEY)
#   - For API tests: server running on localhost:3001
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_TESTS_DIR="$PROJECT_ROOT/server/tests"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LIST_ONLY=false
SPECIFIC_TEST=""

# Parse arguments
for arg in "$@"; do
  case $arg in
    --list)
      LIST_ONLY=true
      ;;
    --help|-h)
      echo "Usage: $0 [options] [test-name]"
      echo ""
      echo "Options:"
      echo "  --list      List available tests without running"
      echo "  --help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Run all tests"
      echo "  $0 --list             # List available tests"
      echo "  $0 movie-tools        # Run only movie-tools.test.ts"
      echo "  $0 watchlist          # Run only watchlist-tools.test.ts"
      echo "  $0 conversations      # Run only conversations-api.test.ts"
      exit 0
      ;;
    *)
      # Strip leading dashes if user accidentally uses --test-name format
      SPECIFIC_TEST="${arg#--}"
      SPECIFIC_TEST="${SPECIFIC_TEST#-}"
      ;;
  esac
done

# Discover all test files
discover_tests() {
  find "$SERVER_TESTS_DIR" -name "*.test.ts" -type f 2>/dev/null | sort
}

# Get test name from path
get_test_name() {
  basename "$1" .test.ts
}

cd "$PROJECT_ROOT/server"

echo "========================================"
echo "       Server Unit Tests"
echo "========================================"
echo

# Get all test files
TEST_FILES=$(discover_tests)

if [ -z "$TEST_FILES" ]; then
  echo -e "${YELLOW}No test files found in $SERVER_TESTS_DIR${NC}"
  exit 0
fi

# List mode
if [ "$LIST_ONLY" = true ]; then
  echo "Available tests:"
  echo
  for test_file in $TEST_FILES; do
    test_name=$(get_test_name "$test_file")
    echo "  - $test_name"
  done
  echo
  echo "Run a specific test with: $0 <test-name>"
  exit 0
fi

# Filter to specific test if provided
if [ -n "$SPECIFIC_TEST" ]; then
  FILTERED_FILES=""
  for test_file in $TEST_FILES; do
    test_name=$(get_test_name "$test_file")
    if [[ "$test_name" == *"$SPECIFIC_TEST"* ]]; then
      FILTERED_FILES="$test_file"
      break
    fi
  done
  
  if [ -z "$FILTERED_FILES" ]; then
    echo -e "${RED}No test matching '$SPECIFIC_TEST' found${NC}"
    echo "Available tests:"
    for test_file in $TEST_FILES; do
      echo "  - $(get_test_name "$test_file")"
    done
    exit 1
  fi
  
  TEST_FILES="$FILTERED_FILES"
fi

# Count tests
TOTAL=$(echo "$TEST_FILES" | wc -l | tr -d ' ')
PASSED=0
FAILED=0

echo "Found $TOTAL test file(s)"
echo

# Run each test
for test_file in $TEST_FILES; do
  test_name=$(get_test_name "$test_file")
  
  echo "----------------------------------------"
  echo "  Running: $test_name"
  echo "----------------------------------------"
  echo
  
  if npx ts-node "$test_file"; then
    echo -e "${GREEN}✓ $test_name passed${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ $test_name failed${NC}"
    ((FAILED++))
  fi
  echo
done

# Summary
echo "========================================"
echo "  Summary: $PASSED passed, $FAILED failed"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
