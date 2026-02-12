#!/bin/bash
# Quick server restart helper script
# Usage: ./restart-server.sh

echo "🔄 Stopping server..."
# Find PID listening on port 3500 and kill it
PID=$(lsof -ti :3500)
if [ -n "$PID" ]; then
    echo "   Killing process $PID..."
    kill -9 $PID
    sleep 1
else
    echo "   No server found on port 3500"
fi

echo "✅ Starting server..."
node server.js
