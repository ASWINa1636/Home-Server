#!/bin/bash
echo "Starting HomeServer..."

cd "$(dirname "$0")"
source env/bin/activate

cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
cd ..

echo ""
echo "Server running at:"
echo "  Local:   http://localhost:8000"
echo "  Network: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "Press Ctrl+C to stop"
wait