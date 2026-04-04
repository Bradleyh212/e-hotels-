#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

echo "Setting up database..."
cd "$BACKEND_DIR" || exit
./setup.sh
cd "$ROOT_DIR" || exit

echo "Starting backend..."
cd "$BACKEND_DIR" || exit
npm run dev &
BACKEND_PID=$!
cd "$ROOT_DIR" || exit

echo "Starting frontend..."
cd "$ROOT_DIR/frontend" || exit
python3 -m http.server 5500 &
FRONTEND_PID=$!
cd "$ROOT_DIR" || exit

echo "Backend running on http://localhost:3000"
echo "Frontend running on http://localhost:5500"
echo "Press Ctrl+C to stop everything."

cleanup() {
	echo ""
	echo "Stopping services..."
	kill $BACKEND_PID 2>/dev/null
	kill $FRONTEND_PID 2>/dev/null
	exit 0
}

trap cleanup SIGINT
wait