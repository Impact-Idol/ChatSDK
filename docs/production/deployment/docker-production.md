# ChatSDK Production Deployment - Docker

This guide covers deploying ChatSDK to production using Docker and Docker Compose.

## Overview

ChatSDK production deployment consists of:
- **API Server** (Node.js + Express)
- **PostgreSQL** (Database)
- **Centrifugo** (WebSocket/real-time messaging)
- **Redis** (Caching + Pub/Sub)
- **MinIO** (Object storage for files)
- **Nginx** (Reverse proxy + SSL termination)

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- Minimum server specs:
  - 4 CPU cores
  - 8 GB RAM
  - 50 GB SSD storage

## Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: chatsdk-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: '-E UTF8 --locale=en_US.UTF-8'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: chatsdk-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Centrifugo Real-time Server
  centrifugo:
    image: centrifugo/centrifugo:v5
    container_name: chatsdk-centrifugo
    restart: unless-stopped
    environment:
      CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: ${CENTRIFUGO_SECRET}
      CENTRIFUGO_API_KEY: ${CENTRIFUGO_API_KEY}
      CENTRIFUGO_ADMIN_PASSWORD: ${CENTRIFUGO_ADMIN_PASSWORD}
      CENTRIFUGO_ADMIN_SECRET: ${CENTRIFUGO_ADMIN_SECRET}
      CENTRIFUGO_ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    command: centrifugo --config=/centrifugo/config.json
    volumes:
      - ./docker/centrifugo-config.json:/centrifugo/config.json:ro
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:8000/health']
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: chatsdk-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER: ${MINIO_BROWSER:-on}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ChatSDK API Server
  api:
    image: chatsdk/api:${CHATSDK_VERSION:-latest}
    container_name: chatsdk-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5500

      # Database
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

      # Redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}

      # Centrifugo
      CENTRIFUGO_URL: http://centrifugo:8000
      CENTRIFUGO_API_KEY: ${CENTRIFUGO_API_KEY}
      CENTRIFUGO_SECRET: ${CENTRIFUGO_SECRET}

      # MinIO
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: false
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      MINIO_BUCKET: chatsdk

      # App Configuration
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}

      # Monitoring
      METRICS_ENABLED: true
      LOG_LEVEL: ${LOG_LEVEL:-info}

    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      centrifugo:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:5500/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: chatsdk-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
      - nginx_logs:/var/log/nginx
    depends_on:
      - api
      - centrifugo
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost/health']
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - chatsdk-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  nginx_cache:
    driver: local
  nginx_logs:
    driver: local

networks:
  chatsdk-network:
    driver: bridge
```

## Environment Variables

Create `.env.production`:

```bash
# Application
CHATSDK_VERSION=1.0.0
NODE_ENV=production
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database
POSTGRES_DB=chatsdk
POSTGRES_USER=chatsdk
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_456

# Centrifugo
CENTRIFUGO_SECRET=CHANGE_THIS_CENTRIFUGO_SECRET_789
CENTRIFUGO_API_KEY=CHANGE_THIS_API_KEY_012
CENTRIFUGO_ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD_345
CENTRIFUGO_ADMIN_SECRET=CHANGE_THIS_ADMIN_SECRET_678

# MinIO
MINIO_ROOT_USER=chatsdk
MINIO_ROOT_PASSWORD=CHANGE_THIS_MINIO_PASSWORD_901
MINIO_BROWSER=off

# JWT
JWT_SECRET=CHANGE_THIS_JWT_SECRET_234

# Monitoring (optional)
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD_567
```

**IMPORTANT**: Change all `CHANGE_THIS_*` passwords before deployment!

## Nginx Configuration

Create `docker/nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=50r/s;

    # Upstream servers
    upstream api_backend {
        least_conn;
        server api:5500 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream centrifugo_backend {
        least_conn;
        server centrifugo:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        listen [::]:80;
        server_name yourdomain.com www.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL certificates (Let's Encrypt)
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling on;
        ssl_stapling_verify on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API endpoints
        location /api {
            limit_req zone=api_limit burst=50 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket endpoint (Centrifugo)
        location /ws {
            limit_req zone=ws_limit burst=20 nodelay;

            proxy_pass http://centrifugo_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        # Static files (if serving frontend from same server)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;

            # Cache static assets
            location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
```

## Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourorg/chatsdk.git
cd chatsdk

# Checkout production branch/tag
git checkout v1.0.0

# Copy environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
# Change all CHANGE_THIS_* passwords!
```

### 3. SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo mkdir -p docker/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
sudo chmod 644 docker/nginx/ssl/*.pem

# Set up auto-renewal
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart nginx
```

### 4. Build and Deploy

```bash
# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Initialize Database

```bash
# Run migrations
docker exec -it chatsdk-api npm run db:migrate

# Verify database
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "\dt"
```

### 6. Verify Deployment

```bash
# Health check
curl https://yourdomain.com/health

# API test
curl https://yourdomain.com/api/health

# WebSocket test
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://yourdomain.com/ws
```

## Monitoring

```bash
# View all container logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api

# Monitor resource usage
docker stats

# Check container health
docker-compose -f docker-compose.prod.yml ps
```

## Backup

```bash
# Backup database
docker exec chatsdk-postgres pg_dump -U chatsdk chatsdk | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup MinIO data
docker exec chatsdk-minio mc mirror /data /backup/minio-$(date +%Y%m%d)

# Backup Redis (if needed)
docker exec chatsdk-redis redis-cli --rdb /data/dump.rdb
```

## Updates

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart with zero downtime (if using multiple replicas)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build api

# Or full restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check resource usage
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### Database Connection Issues

```bash
# Check database is running
docker exec -it chatsdk-postgres pg_isready -U chatsdk

# Check connections
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "SELECT * FROM pg_stat_activity;"

# Check environment variables
docker exec -it chatsdk-api env | grep POSTGRES
```

### High Memory Usage

```bash
# Set memory limits in docker-compose.yml
services:
  api:
    mem_limit: 2g
    mem_reservation: 1g
```

## Security Checklist

- [x] Change all default passwords
- [x] Use HTTPS with valid SSL certificate
- [x] Enable firewall (ufw/iptables)
- [x] Set up rate limiting
- [x] Configure security headers
- [x] Disable unnecessary services
- [x] Regular security updates
- [x] Monitor access logs
- [x] Use secrets management (Docker secrets/Vault)

## Production Checklist

- [x] Environment variables configured
- [x] SSL certificates installed
- [x] Database migrations run
- [x] Health checks passing
- [x] Monitoring set up
- [x] Backups configured
- [x] Firewall rules configured
- [x] DNS configured
- [x] Load testing completed
- [x] Disaster recovery plan documented

## Support

For production deployment issues:
- Review logs: `docker-compose -f docker-compose.prod.yml logs`
- Check health: `curl https://yourdomain.com/health`
- Monitor metrics: See monitoring guide
- Contact: production-support@chatsdk.com

---

**Production Deployment Complete!** 🚀
