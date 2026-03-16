#!/bin/bash

# Kill process on port 3000 and restart dev server
PORT=3000

echo "🛑 Killing process on port $PORT..."
lsof -i :$PORT | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "✅ Port $PORT freed"
echo "🚀 Starting dev server..."

npm run dev
