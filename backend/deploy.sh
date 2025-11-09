#!/bin/bash
set -e

echo "🛠 Running Sequelize migrations..."
npm run migrate

echo "✅ Migrations complete."
