#!/bin/bash

echo "🛑 Stopping DB container..."
docker stop opentournaments-db

echo "🔥 Removing old DB container..."
docker rm opentournaments-db

echo "🧨 Deleting old DB volume..."
docker volume rm opentournaments_db_data

echo "🚀 Recreating DB..."
docker run -d \
  --name opentournaments-db \
  -e POSTGRES_USER=root_user \
  -e POSTGRES_PASSWORD=Matrix2510//++! \
  -e POSTGRES_DB=opentournament_prod \
  -v opentournaments_db_data:/var/lib/postgresql/data \
  postgres:15

echo "⏳ Waiting 10 seconds for DB startup..."
sleep 10

echo "🚀 Running migrations..."
docker exec opentournaments-backend npx sequelize-cli db:migrate --env production

echo "✅ Reset complete!"
