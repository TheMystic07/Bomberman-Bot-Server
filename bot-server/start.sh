#!/bin/bash

# Bomberman Bot Server Start Script

echo "🤖 Starting Bomberman Bot Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start the server
echo "🚀 Starting server..."
npm start

