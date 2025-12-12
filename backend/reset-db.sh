#!/bin/bash

# Define constants based on your compose file
DB_SERVICE_NAME="db"
DB_NAME="opentournament_prod"
DB_USER="root_user"
DB_PASS="Matrix2510//++!" 

# Assuming your compose file is in the root of the project
COMPOSE_FILE="docker-compose.prod.yml"

echo "🛑 Stopping and Removing DB service and its volume..."
# Use docker compose down with --volumes to stop the DB service and delete the volume
docker compose -f $COMPOSE_FILE stop $DB_SERVICE_NAME 2>/dev/null || true
docker compose -f $COMPOSE_FILE rm -f -s $DB_SERVICE_NAME 2>/dev/null || true
docker compose -f $COMPOSE_FILE volume rm opentournaments_db_data 2>/dev/null || true

echo "🚀 Starting DB service fresh (Docker Compose manages the network)..."
# Start the DB service only. This ensures it's on the correct network.
docker compose -f $COMPOSE_FILE up -d --no-deps $DB_SERVICE_NAME

echo "⏳ Waiting 15 seconds for DB startup..."
sleep 15

# ---------------------------------------------------------------------
# NEW STEPS: CREATE SCHEMAS
# Use the docker compose ps command to find the DB container's runtime name
# NOTE: The command must use the PGPASSWORD variable for security.
# ---------------------------------------------------------------------
DB_RUNTIME_NAME=$(docker compose -f $COMPOSE_FILE ps -q $DB_SERVICE_NAME)

echo "🛠️ Creating 'platform' schema..."
docker exec -e PGPASSWORD=$DB_PASS \
  $DB_RUNTIME_NAME \
  psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS platform AUTHORIZATION $DB_USER;"

echo "🛠️ Creating 'chat' schema..."
docker exec -e PGPASSWORD=$DB_PASS \
  $DB_RUNTIME_NAME \
  psql -U $DB_USER -d $DB_NAME -c "CREATE SCHEMA IF NOT EXISTS chat AUTHORIZATION $DB_USER;"

echo "⏳ Waiting 20 seconds for application containers to connect and stabilize..."
sleep 20

# ---------------------------------------------------------------------
# UPDATED STEPS: RUN MIGRATIONS FOR BOTH BACKENDS
# ---------------------------------------------------------------------

# These containers should now be stable and able to resolve the DB hostname
echo "🚀 Running migrations for PLATFORM backend (platform schema)..."
docker exec opentournaments-backend npx sequelize-cli db:migrate --env production

echo "🚀 Running migrations for CHAT backend (chat schema)..."
docker exec opentournaments-chat-backend npx sequelize-cli db:migrate --env production

echo "✅ Reset complete! Both schemas created and migrations run."