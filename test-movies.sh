#!/bin/bash

# 1. Create a user (or use existing)
echo "Creating User..."
USER_RES=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"movie_fan@example.com"}')
echo $USER_RES
USER_ID=$(echo $USER_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "User ID: $USER_ID"

# 2. Create a conversation
echo -e "\nCreating Conversation..."
CONV_RES=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"title\":\"Movie Chat\"}")
echo $CONV_RES
CONV_ID=$(echo $CONV_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Conversation ID: $CONV_ID"

# 3. Send a message (Streaming) that should trigger the movie tool
echo -e "\nSending Message (Streaming)..."
curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"conversationId\":\"$CONV_ID\",\"message\":\"I really liked The Matrix and Inception. Can you recommend some similar movies?\"}"
