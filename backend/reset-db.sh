#!/bin/bash

# Define environment variables for the DB container and Psql
DB_NAME="opentournament_prod"
DB_USER="root_user"
DB_PASS="Matrix2510//++!" 
DB_CONTAINER_NAME="opentournaments-db"
DB_VOLUME_NAME="opentournaments_db_data"

echo "🛑 Stopping DB container..."
# Use || true to prevent the script from failing if the container doesn't exist
docker stop $DB_CONTAINER_NAME 2>/dev/null || true

echo "🔥 Removing old DB container..."
docker rm $DB_CONTAINER_NAME 2>/dev/null || true

echo "🧨 Deleting old DB volume..."
docker volume rm $DB_VOLUME_NAME 2>/dev/null || true

echo "🚀 Recreating DB container with fresh volume..."
docker run -d \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASS \
  -e POSTGRES_DB=$DB_NAME \
  -v $DB_VOLUME_NAME:/var/lib/postgresql/data \
  postgres:15

echo "⏳ Waiting 10 seconds for DB startup..."
sleep 10

# ---------------------------------------------------------------------
# NEW STEPS: CREATE SCHEMAS
# ---------------------------------------------------------------------
echo "🛠️ Creating 'platform' schema..."
docker exec -e PGPASSWORD=$DB_PASS \
  $DB_CONTAINER_NAME \
  psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS platform AUTHORIZATION $DB_USER;"

echo "🛠️ Creating 'chat' schema..."
docker exec -e PGPASSWORD=$DB_PASS \
  $DB_CONTAINER_NAME \
  psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS chat AUTHORIZATION $DB_USER;"

# ---------------------------------------------------------------------
# FIX: WAIT FOR APPLICATION CONTAINERS TO STABILIZE
# Give the backend and chat containers time to connect to the new DB and start up.
# ---------------------------------------------------------------------
echo "⏳ Waiting 20 seconds for application containers to connect and stabilize..."
sleep 20 # Increased wait time for Node/DB connection to complete 

# ---------------------------------------------------------------------
# UPDATED STEPS: RUN MIGRATIONS FOR BOTH BACKENDS
# ---------------------------------------------------------------------

# 1. Run migrations for the main platform backend
echo "🚀 Running migrations for PLATFORM backend (platform schema)..."
docker exec opentournaments-backend npx sequelize-cli db:migrate --env production

# 2. Run migrations for the new chat backend
echo "🚀 Running migrations for CHAT backend (chat schema)..."
docker exec opentournaments-chat-backend npx sequelize-cli db:migrate --env production

echo "✅ Reset complete! Both schemas created and migrations run."