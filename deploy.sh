#!/bin/bash

# Manual deployment script for DigitalOcean droplet

echo "Starting manual deployment..."

# Use existing deployment directory or default
DEPLOY_DIR="${SERVER_DOCKER_COMPOSE_DIR:-$HOME/deployments/open-tournaments}"
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# Check if .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Please create a .env file first or run setup-droplet.sh"
  exit 1
fi

# Pull latest images (make sure these match your Docker Hub repos)
echo "Pulling latest images..."
docker pull $DOCKERHUB_BACKEND_REPO:latest
docker pull $DOCKERHUB_CHAT_BACKEND_REPO:latest
docker pull $DOCKERHUB_FRONTEND_REPO:latest

# Stop and restart containers
echo "Restarting containers..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Clean up
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"
echo "Check if containers are running: docker ps"