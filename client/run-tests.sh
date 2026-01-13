#!/bin/bash

# Frontend Test Runner Script
# This script makes it easy to run frontend tests

cd "$(dirname "$0")"

echo "================================"
echo "  Frontend Test Runner"
echo "================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Running tests..."
echo ""

# Run tests with different modes based on argument
case "$1" in
    "watch")
        echo "Running tests in watch mode..."
        npm test
        ;;
    "ui")
        echo "Opening test UI..."
        npm run test:ui
        ;;
    "coverage")
        echo "Running tests with coverage..."
        npm run test:coverage
        ;;
    *)
        echo "Running all tests once..."
        npm run test:run
        ;;
esac

echo ""
echo "================================"
echo "  Test run complete"
echo "================================"
