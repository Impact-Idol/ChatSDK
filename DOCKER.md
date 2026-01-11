# ChatSDK Docker Images

Official Docker images for ChatSDK, published to GitHub Container Registry (GHCR).

---

## 📦 Available Images

### API Server
- **Image:** `ghcr.io/piper5ul/chatsdk/api`
- **Tags:**
  - `latest` - Latest stable release from main branch
  - `2.0.0` - Specific version (e.g., v2.0.0, v2.1.0)
  - `main` - Development build from main branch
- **Platforms:** `linux/amd64`, `linux/arm64`

**Pull the image:**
```bash
docker pull ghcr.io/piper5ul/chatsdk/api:latest
```

---

## 🚀 Quick Start

### Production Deployment

```bash
# 1. Pull the image
docker pull ghcr.io/piper5ul/chatsdk/api:latest

# 2. Run with Docker Compose
cd docker
docker compose -f docker-compose.prod.yml up -d
```

This starts:
- ChatSDK API Server (from published image)
- Centrifugo (WebSocket server)
- Nginx (reverse proxy)

### Development Setup

```bash
# Use docker-compose.yml for local development (builds from source)
cd docker
docker compose up -d
```

---

## 🔧 Configuration

### Environment Variables

Required variables (see `.env.example`):

```bash
# Database
DB_HOST=your-postgres-host
DB_NAME=chatsdk
DB_USER=chatsdk
DB_PASSWORD=your-secure-password

# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=chatsdk-production

# Centrifugo
CENTRIFUGO_URL=wss://your-domain.com/connection/websocket
CENTRIFUGO_API_KEY=your-api-key
CENTRIFUGO_TOKEN_SECRET=your-token-secret

# Redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret
```

### Using with Docker Run

```bash
docker run -d \
  -p 5500:5500 \
  -e DB_HOST=postgres \
  -e DB_NAME=chatsdk \
  -e DB_USER=chatsdk \
  -e DB_PASSWORD=your-password \
  -e S3_ENDPOINT=https://s3.amazonaws.com \
  -e S3_ACCESS_KEY=your-key \
  -e S3_SECRET_KEY=your-secret \
  -e S3_BUCKET=chatsdk \
  ghcr.io/piper5ul/chatsdk/api:latest
```

---

## 🏗️ Building Custom Images

### Modify and Build Locally

```bash
# Clone the repository
git clone https://github.com/piper5ul/ChatSDK.git
cd ChatSDK

# Make your changes, then build
docker build -f docker/Dockerfile.api -t my-custom-api .

# Run your custom image
docker run -d -p 5500:5500 my-custom-api
```

### Push to Your Own Registry

```bash
# Tag for your registry
docker tag my-custom-api your-registry.io/chatsdk/api:latest

# Push
docker push your-registry.io/chatsdk/api:latest
```

---

## 🔄 Image Updates

### Automatic Updates

Images are automatically built and pushed when:
- **New commits** are pushed to `main` branch → `latest` and `main` tags updated
- **New git tags** are created (e.g., `v2.0.0`) → versioned tags created (`2.0.0`, `2.0`, `2`)
- **Pull requests** are opened → PR-specific tags for testing

### Manual Update Workflow

GitHub Actions workflow can also be triggered manually:
1. Go to: https://github.com/piper5ul/ChatSDK/actions/workflows/docker-publish.yml
2. Click "Run workflow"
3. Select branch and run

---

## 📊 Multi-Platform Support

All images support both:
- **`linux/amd64`** - Intel/AMD processors (most cloud providers)
- **`linux/arm64`** - Apple Silicon, AWS Graviton, Raspberry Pi

Docker automatically pulls the correct image for your platform.

**Example on Apple Silicon:**
```bash
# Automatically pulls arm64 image
docker pull ghcr.io/piper5ul/chatsdk/api:latest

# Verify platform
docker inspect ghcr.io/piper5ul/chatsdk/api:latest | grep Architecture
# Output: "Architecture": "arm64"
```

---

## 🔐 Private Registries (Optional)

### Using with Docker Hub

If you prefer Docker Hub:

```bash
# Login to Docker Hub
docker login

# Tag for Docker Hub
docker tag ghcr.io/piper5ul/chatsdk/api:latest chatsdk/api:latest

# Push
docker push chatsdk/api:latest
```

### Using with AWS ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag for ECR
docker tag ghcr.io/piper5ul/chatsdk/api:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/chatsdk/api:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/chatsdk/api:latest
```

---

## 🧪 Testing Images

### Health Check

```bash
# Run container
docker run -d --name chatsdk-test -p 5500:5500 \
  ghcr.io/piper5ul/chatsdk/api:latest

# Wait for startup
sleep 10

# Test health endpoint
curl http://localhost:5500/health

# Expected response:
# {"status":"ok","version":"2.0.0"}

# Cleanup
docker stop chatsdk-test
docker rm chatsdk-test
```

### Logs

```bash
# View logs
docker logs chatsdk-test

# Follow logs
docker logs -f chatsdk-test

# Last 100 lines
docker logs --tail 100 chatsdk-test
```

---

## 📝 Image Metadata

### View Image Details

```bash
# Inspect image
docker inspect ghcr.io/piper5ul/chatsdk/api:latest

# View labels
docker inspect ghcr.io/piper5ul/chatsdk/api:latest | jq '.[0].Config.Labels'

# View size
docker images ghcr.io/piper5ul/chatsdk/api:latest
```

### Image Layers

```bash
# View image history
docker history ghcr.io/piper5ul/chatsdk/api:latest
```

---

## 🚨 Troubleshooting

### Image Pull Fails

**Problem:** `Error response from daemon: pull access denied`

**Solution:**
```bash
# Public images don't require authentication, but if you see this:
# 1. Check image name is correct
# 2. Verify image exists at: https://github.com/piper5ul/ChatSDK/pkgs/container/chatsdk%2Fapi

# For private images, login first:
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Container Won't Start

**Problem:** Container exits immediately

**Solution:**
```bash
# Check logs
docker logs <container-id>

# Common issues:
# 1. Missing environment variables (see Configuration above)
# 2. Database connection failed (check DB_HOST, DB_PASSWORD)
# 3. Port already in use (use different port: -p 5501:5500)
```

### Performance Issues

**Problem:** Container using too much CPU/memory

**Solution:**
```bash
# Limit resources
docker run -d \
  --cpus="1.0" \
  --memory="512m" \
  -p 5500:5500 \
  ghcr.io/piper5ul/chatsdk/api:latest

# Or in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       cpus: '1.0'
#       memory: 512M
```

---

## 📚 Related Documentation

- **[Docker README](./docker/README.md)** - Local development setup
- **[Production Deployment](./docs/deployment/)** - Production best practices
- **[Environment Variables](./docker/.env.example)** - Full configuration reference
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues

---

## 🤝 Contributing

Want to improve the Docker setup?

1. Fork the repository
2. Make your changes
3. Test locally: `docker build -f docker/Dockerfile.api -t test .`
4. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📞 Support

- **Issues:** https://github.com/piper5ul/ChatSDK/issues
- **Discussions:** https://github.com/piper5ul/ChatSDK/discussions
- **Documentation:** [docs.chatsdk.dev](https://docs.chatsdk.dev) (coming soon)

---

**Last Updated:** January 2026
**Docker Image Version:** 2.0.0+
