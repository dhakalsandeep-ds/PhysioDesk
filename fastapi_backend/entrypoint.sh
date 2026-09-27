#!/bin/sh
set -e

PORT="${PORT:-8000}"


while ! nc -z physiodesk_db 5432; do
  sleep 1
done
echo "Running migrations..."
uv run alembic upgrade head

echo "Seeding database..."
uv run python seeder.py

uv run uvicorn main:app --host 0.0.0.0 --port 8000
