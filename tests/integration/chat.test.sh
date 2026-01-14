#!/bin/bash
#
# Integration test for chat API
# Requires server running on localhost:3001
#

set -euo pipefail

echo "=== Chat Integration Test ==="
echo

# 1. Create a user (or use existing)
echo "Creating User..."
USER_RES=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')
echo "$USER_RES"
USER_ID=$(echo "$USER_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "User ID: $USER_ID"

if [ -z "$USER_ID" ]; then
  echo "Error: Could not get User ID"
  exit 1
fi

# 2. Create a conversation
echo -e "\nCreating Conversation..."
CONV_RES=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"title\":\"Test Chat\"}")
echo "$CONV_RES"
CONV_ID=$(echo "$CONV_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Conversation ID: $CONV_ID"

if [ -z "$CONV_ID" ]; then
  echo "Error: Could not get Conversation ID"
  exit 1
fi

# 3. Send a message (Streaming)
echo -e "\nSending Message (Streaming)..."
curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"conversationId\":\"$CONV_ID\",\"message\":\"Calculate 50 + 20\"}"

echo -e "\n\n=== Chat Integration Test Complete ==="
