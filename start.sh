#!/bin/bash
echo "Starting HomeServer..."

cd "$(dirname "$0")"
source env/bin/activate

cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
UVICORN_PID=$!
cd ..

echo ""
echo "Server running at:"
echo "  Local:     http://localhost:8000"
echo "  Network:   http://$(hostname -I | awk '{print $1}'):8000"

# Show Tailscale IP if available
TS_IP=$(tailscale ip -4 2>/dev/null)
if [ -n "$TS_IP" ]; then
  echo "  Tailscale: http://${TS_IP}:8000  (private, high-speed)"
fi

echo ""
echo "Press Ctrl+C to stop"
trap 'kill $UVICORN_PID 2>/dev/null; exit' SIGINT
wait