
# Define environment variables for the DB container and Psql
DB_NAME="opentournament_prod"
DB_USER="root_user"
DB_PASS="Matrix2510//++!" # Be sure to quote special characters in your actual production script!
DB_CONTAINER_NAME="opentournaments-db"
DB_VOLUME_NAME="opentournaments_db_data"

echo "🛑 Stopping DB container..."
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



# 1. Run migrations for the main platform backend
echo "🚀 Running migrations for PLATFORM backend "
docker exec opentournaments-backend npx sequelize-cli db:migrate --env production


# that has the sequelize-cli installed (via its Dockerfile).
echo "🚀 Running migrations for CHAT backend "
docker exec opentournaments-chat-backend npx sequelize-cli db:migrate --env production

echo "✅ Reset complete! "