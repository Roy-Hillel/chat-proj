#!/bin/bash
#
# Run all tests for the chat-proj application
#
# Usage:
#   ./tests/run-all.sh                    # Run all tests
#   ./tests/run-all.sh --unit-only        # Run only unit tests (no server required)
#   ./tests/run-all.sh --integration-only # Run only integration tests (server required)
#
# Requirements:
#   - For unit tests: server/.env with TASTE_DIVE_API_KEY and OMDB_API_KEY
#   - For integration tests: server running on localhost:3001
#   - For client tests: client dependencies installed
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RUN_UNIT=true
RUN_INTEGRATION=true
RUN_CLIENT=true

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
    *)
      ;;
  esac
done

FAILED=0

echo "========================================"
echo "       Running All Tests"
echo "========================================"
echo

# 1. Server Unit Tests (movie tools)
if [ "$RUN_UNIT" = true ]; then
  echo "----------------------------------------"
  echo "  Server Unit Tests (Movie Tools)"
  echo "----------------------------------------"
  if "$SCRIPT_DIR/run-server-tests.sh"; then
    echo "✓ Server unit tests passed"
  else
    echo "✗ Server unit tests failed"
    FAILED=1
  fi
  echo
fi

# 2. Client Unit Tests
if [ "$RUN_CLIENT" = true ]; then
  echo "----------------------------------------"
  echo "  Client Unit Tests"
  echo "----------------------------------------"
  if [ -f "$PROJECT_ROOT/client/run-tests.sh" ]; then
    if (cd "$PROJECT_ROOT/client" && ./run-tests.sh); then
      echo "✓ Client unit tests passed"
    else
      echo "✗ Client unit tests failed"
      FAILED=1
    fi
  else
    echo "↷ Skipping: client/run-tests.sh not found"
  fi
  echo
fi

# 3. Integration Tests (require running server)
if [ "$RUN_INTEGRATION" = true ]; then
  echo "----------------------------------------"
  echo "  Integration Tests"
  echo "----------------------------------------"
  echo "Note: These require the server running on localhost:3001"
  echo

  # Check if server is running
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "Server is running. Running integration tests..."
    echo

    # Chat integration test
    if bash "$SCRIPT_DIR/integration/chat.test.sh"; then
      echo "✓ Chat integration test passed"
    else
      echo "✗ Chat integration test failed"
      FAILED=1
    fi
    echo

    # Movies integration test
    if bash "$SCRIPT_DIR/integration/movies.test.sh" "Inception"; then
      echo "✓ Movies integration test passed"
    else
      echo "✗ Movies integration test failed"
      FAILED=1
    fi
  else
    echo "↷ Skipping integration tests: server not running on localhost:3001"
    echo "   Start the server with: cd server && npm run dev"
  fi
  echo
fi

echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo "  All tests passed! ✓"
else
  echo "  Some tests failed ✗"
fi
echo "========================================"

exit $FAILED
