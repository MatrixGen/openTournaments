#!/bin/bash
set -e

echo "🔄 Pulling latest images..."
docker compose -f docker-compose.prod.yml --env-file .env.db pull

echo "🚀 Restarting containers..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "🧹 Cleaning old images..."
docker image prune -f

echo "✅ Deployment complete!"
