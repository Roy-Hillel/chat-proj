#!/bin/bash
#
# Run server-side unit tests
#
# Usage:
#   ./tests/run-server-tests.sh               # Run movie tools tests with default query
#   ./tests/run-server-tests.sh "Inception"   # Run movie tools tests with custom query
#   ./tests/run-server-tests.sh --api         # Run API tests (requires server running)
#   ./tests/run-server-tests.sh --all         # Run all server tests
#
# Requirements:
#   - Movie tools tests: server/.env with TASTE_DIVE_API_KEY and OMDB_API_KEY
#   - API tests: server running on localhost:3001
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RUN_MOVIE_TESTS=true
RUN_API_TESTS=false
QUERY="The Matrix"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --api)
      RUN_MOVIE_TESTS=false
      RUN_API_TESTS=true
      ;;
    --all)
      RUN_MOVIE_TESTS=true
      RUN_API_TESTS=true
      ;;
    *)
      QUERY="$arg"
      ;;
  esac
done

cd "$PROJECT_ROOT/server"

if [ "$RUN_MOVIE_TESTS" = true ]; then
  echo "=== Movie Tools Unit Tests ==="
  echo "Query: \"$QUERY\""
  echo
  npx ts-node tests/movie-tools.test.ts "$QUERY"
  echo
fi

if [ "$RUN_API_TESTS" = true ]; then
  echo "=== Conversations API Tests ==="
  echo
  npx ts-node tests/conversations-api.test.ts
  echo
fi

echo "=== Server Tests Complete ==="
