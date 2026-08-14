#!/bin/bash
echo "=== Installing HomeServer ==="

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
echo "Edit backend/.env with your settings!"
deactivate
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..

echo "=== Done! Run ./start.sh to launch ==="