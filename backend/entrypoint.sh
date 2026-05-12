#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.5
done
echo "✅ PostgreSQL is up."

echo "⏳ Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.5
done
echo "✅ Redis is up."

echo "🔄 Running migrations..."
python manage.py migrate --noinput

echo "🌱 Seeding demo data..."
python manage.py seed_data --events 300 || true

echo "🚀 Starting Gunicorn..."
exec gunicorn insightflow.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
