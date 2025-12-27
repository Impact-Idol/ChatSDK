# React Chat Demo - Deployment Guide

This guide explains how to deploy the React Chat demo application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Backend services running (API on port 5500, Centrifugo, PostgreSQL, etc.)
- Node.js 20+ (for local development)

## Quick Start

### Option 1: Docker Deployment (Recommended)

Deploy the app in a production-ready Docker container:

```bash
# From the examples/react-chat directory
./deploy.sh
```

The app will be available at **http://localhost:5500**

### Option 2: Manual Docker Commands

```bash
# Build the image
docker compose -f ../../docker/docker-compose.yml build react-chat

# Start the container
docker compose -f ../../docker/docker-compose.yml up -d react-chat

# View logs
docker compose -f ../../docker/docker-compose.yml logs -f react-chat

# Stop the container
docker compose -f ../../docker/docker-compose.yml stop react-chat
```

### Option 3: Local Development

```bash
# Install dependencies (from repo root)
npm install

# Start dev server on port 5500
npm run dev
```

## Configuration

### Environment Variables

The production build uses environment variables from `.env.production`:

- `VITE_API_URL` - API server URL (default: http://localhost:5500)
- `VITE_API_KEY` - API authentication key

These are embedded at build time by Vite.

### Port Configuration

The app is configured to run exclusively on **port 5500**:

- Docker container exposes port 5500
- Nginx listens on port 5500
- Vite dev server uses port 5500
- `strictPort: true` prevents fallback to other ports

## Architecture

### Multi-Stage Docker Build

1. **Builder Stage**: Builds the React app with Vite
   - Installs dependencies
   - Builds core and react packages
   - Compiles TypeScript and bundles assets

2. **Production Stage**: Serves with Nginx
   - Lightweight Alpine-based image
   - Optimized nginx configuration
   - Health check endpoint at `/health`

### Nginx Configuration

- **Port**: 5500
- **Gzip compression**: Enabled for text assets
- **Caching**: 1 year for static assets, no-cache for HTML
- **SPA routing**: All routes fall back to index.html
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

## Management Commands

### View Container Status
```bash
docker compose -f ../../docker/docker-compose.yml ps react-chat
```

### View Logs
```bash
# Real-time logs
docker compose -f ../../docker/docker-compose.yml logs -f react-chat

# Last 100 lines
docker compose -f ../../docker/docker-compose.yml logs --tail=100 react-chat
```

### Restart Container
```bash
docker compose -f ../../docker/docker-compose.yml restart react-chat
```

### Rebuild and Redeploy
```bash
# Rebuild image (after code changes)
docker compose -f ../../docker/docker-compose.yml build react-chat

# Restart with new image
docker compose -f ../../docker/docker-compose.yml up -d react-chat
```

### Stop Container
```bash
# Stop only (preserves container)
docker compose -f ../../docker/docker-compose.yml stop react-chat

# Remove container
docker compose -f ../../docker/docker-compose.yml down react-chat
```

### Kill Process on Port 5500
```bash
# Using npm script
npm run stop

# Using lsof directly
lsof -ti:5500 | xargs kill -9
```

## Health Checks

The container includes health checks:

- **Docker**: Checks `/health` endpoint every 30s
- **Nginx**: Returns "healthy" from `/health` endpoint
- **Browser**: Visit http://localhost:5500/health

## Troubleshooting

### Port 5500 Already in Use

```bash
# Check what's using the port
lsof -i:5500

# Kill the process
npm run stop
# or
lsof -ti:5500 | xargs kill -9
```

### Container Won't Start

```bash
# Check logs for errors
docker compose -f ../../docker/docker-compose.yml logs react-chat

# Verify Docker daemon is running
docker ps

# Rebuild from scratch
docker compose -f ../../docker/docker-compose.yml build --no-cache react-chat
```

### API Connection Errors

1. Verify backend services are running:
   ```bash
   curl http://localhost:5500/health
   ```

2. Check API_URL in `.env.production`

3. Verify CORS settings on the API server

### Build Failures

```bash
# Clean build (removes node_modules and rebuilds)
cd ../../
rm -rf node_modules packages/*/node_modules examples/*/node_modules
npm install
docker compose -f docker/docker-compose.yml build react-chat
```

## Production Considerations

### Security
- Update `VITE_API_KEY` in `.env.production` for production
- Use HTTPS in production (add SSL termination)
- Update nginx security headers as needed
- Enable rate limiting for API endpoints

### Performance
- Assets are compressed with gzip
- Static assets cached for 1 year
- Image is optimized (~40MB final size)
- Uses Alpine Linux for minimal footprint

### Monitoring
- Health check endpoint: `/health`
- Container restart policy: `unless-stopped`
- Access logs available via `docker logs`

### Scaling
- Use a reverse proxy (nginx/Traefik) for multiple instances
- Store environment config in external system
- Use Docker Swarm or Kubernetes for orchestration

## File Structure

```
examples/react-chat/
├── Dockerfile              # Multi-stage Docker build
├── nginx.conf              # Nginx web server configuration
├── .env.production         # Production environment variables
├── deploy.sh              # Deployment automation script
├── README-DEPLOY.md       # This file
├── package.json           # Scripts with port 5500 config
└── vite.config.ts         # Vite config with port 5500
```

## Integration with Backend

The React app expects the following backend services:

- **API Server**: Port 5500 (`/tokens`, `/api/*`)
- **Centrifugo WebSocket**: Port 8000
- **PostgreSQL**: Port 5433
- **Meilisearch**: Port 7700
- **MinIO**: Port 9002
- **Redis**: Port 6379

Ensure these services are running before starting the React app.
