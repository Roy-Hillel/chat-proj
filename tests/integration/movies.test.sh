#!/bin/bash
#
# Integration test for movie recommendations via chat API
# Requires server running on localhost:3001
#
# Usage: ./movies.test.sh "The Matrix"
#

set -euo pipefail

MOVIE_NAME="${1:-The Matrix}"

echo "=== Movie Recommendations Integration Test ==="
echo "Movie: \"$MOVIE_NAME\""
echo

# 1. Create a user (or use existing)
echo "Creating User..."
USER_RES=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"movie_fan@example.com"}')
echo "User Response: $USER_RES"
USER_ID=$(echo "$USER_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "Error: Could not get User ID"
    exit 1
fi

echo "User ID: $USER_ID"

# 2. Create a conversation
echo -e "\nCreating Conversation..."
CONV_RES=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"title\":\"Movie Chat - $MOVIE_NAME\"}")
CONV_ID=$(echo "$CONV_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
    echo "Error: Could not get Conversation ID"
    exit 1
fi

echo "Conversation ID: $CONV_ID"

# 3. Send a message (Streaming) that should trigger the movie tool
MESSAGE="$MOVIE_NAME"

echo -e "\nSending Message: \"$MESSAGE\""
echo -e "Expecting similar movies sorted by IMDb rating...\n"

curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"conversationId\":\"$CONV_ID\",\"message\":\"$MESSAGE\"}"

echo -e "\n\n=== Movie Recommendations Integration Test Complete ==="
