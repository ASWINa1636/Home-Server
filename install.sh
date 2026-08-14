#!/bin/bash
echo "=== Installing HomeServer ==="

# Backend
cd backend
if [ ! -f ../.env.example ] && [ -f .env.example ]; then
    cp .env.example .env
    echo "⚠️  Created backend/.env from template — edit SECRET_KEY before starting!"
fi
cd ..

# Create virtual environment if not exists
if [ ! -d env ]; then
    python3 -m venv env
fi
source env/bin/activate
pip install -r backend/requirements.txt
deactivate

# Frontend
cd frontend
npm install
npm run build
cd ..

echo "=== Done! Run ./start.sh to launch ==="