#!/bin/bash
set -e

# Deploy React Chat Demo
# This script builds and starts the React app in a Docker container on port 5500

cd "$(dirname "$0")/../.."

echo "🚀 Deploying React Chat Demo..."

# Build the React app Docker image
echo "📦 Building Docker image..."
docker compose -f docker/docker-compose.yml build react-chat

# Start the container
echo "🔄 Starting container on port 5500..."
docker compose -f docker/docker-compose.yml up -d react-chat

# Wait for health check
echo "⏳ Waiting for app to be healthy..."
timeout 30s bash -c 'until docker compose -f docker/docker-compose.yml ps react-chat | grep -q "healthy"; do sleep 2; done' || {
    echo "⚠️  Health check timeout, but container may still be starting..."
}

# Show status
echo ""
echo "✅ React Chat Demo deployed successfully!"
echo ""
echo "📊 Container status:"
docker compose -f docker/docker-compose.yml ps react-chat

echo ""
echo "🌐 Access the app at: http://localhost:5500"
echo ""
echo "📝 Useful commands:"
echo "  View logs:    docker compose -f docker/docker-compose.yml logs -f react-chat"
echo "  Stop app:     docker compose -f docker/docker-compose.yml stop react-chat"
echo "  Restart app:  docker compose -f docker/docker-compose.yml restart react-chat"
echo "  Remove app:   docker compose -f docker/docker-compose.yml down react-chat"
